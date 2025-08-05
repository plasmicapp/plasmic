import { DbMgr } from "@/wab/server/db/DbMgr";
import { createSystemDiscourseClient } from "@/wab/server/discourse/clients";
import { TeamDiscourseInfo } from "@/wab/server/entities/Entities";
import { PreconditionFailedError } from "@/wab/shared/ApiErrors/errors";
import { TeamId } from "@/wab/shared/ApiSchema";
import {
  BASE_URL,
  FEATURE_TIERS,
  FeatureTierConfig,
  PRIVATE_SUPPORT_CATEGORY_ID,
  SUPPORT_GROUP_NAME,
} from "@/wab/shared/discourse/config";
import {
  Category,
  CategoryMutation,
  DiscourseClient,
  GroupAliasLevel,
  GroupData,
  GroupVisibilityLevel,
  PermissionType,
} from "@/wab/shared/discourse/DiscourseClient";

/**
 * Creates or updates the org's Discourse configuration,
 * then saves the relevant info to our database.
 *
 * This sets up the following entities in Discourse:
 * - Private support category
 * - Private group to control access to category
 */
export async function syncTeamDiscourseInfo(
  mgr: DbMgr,
  teamId: TeamId,
  slug: string,
  name: string
) {
  const team = await mgr.getTeamById(teamId);
  const featureTierConfig = team.featureTier
    ? FEATURE_TIERS[team.featureTier.name]
    : undefined;
  if (!featureTierConfig) {
    throw new PreconditionFailedError(
      `Team ${teamId} has invalid feature tier ${team.featureTier?.name}.`
    );
  }

  const existingInfo = await mgr.getDiscourseInfoByTeamId(teamId);
  const { categoryId, groupId } = await upsertToDiscourse({
    systemDiscourseClient: createSystemDiscourseClient(),
    existingInfo,
    teamId,
    slug,
    name,
    featureTierConfig,
  });
  return await mgr.upsertDiscourseInfo({
    teamId,
    slug,
    name,
    categoryId,
    groupId,
  });
}

interface Ctx {
  systemDiscourseClient: DiscourseClient;
  existingInfo: TeamDiscourseInfo | undefined;
  teamId: string;
  slug: string;
  name: string;
  featureTierConfig: FeatureTierConfig;
}

async function upsertToDiscourse(ctx: Ctx) {
  const groupId = await upsertDiscourseGroup(ctx);
  const { category, parentCategory } = await upsertDiscourseCategory(ctx);
  await updateDiscourseCategoryWelcomePost(ctx, category, parentCategory);
  await ensureSupportGroupTrackingCategory(ctx, category);
  return { categoryId: category.id, groupId };
}

async function upsertDiscourseGroup(ctx: Ctx) {
  const { systemDiscourseClient, existingInfo, slug, name } = ctx;

  const groupData: GroupData = {
    name: slug,
    full_name: name,
    members_visibility_level: GroupVisibilityLevel.MEMBERS,
    mentionable_level: GroupAliasLevel.MEMBERS_MODS_AND_ADMINS,
    messageable_level: GroupAliasLevel.NOBODY,
    visibility_level: GroupVisibilityLevel.MEMBERS,
    grant_trust_level: 2, // TL2 grants them more votes
  };
  if (existingInfo) {
    await systemDiscourseClient.groupUpdate(existingInfo.groupId, {
      group: groupData,
    });
    return existingInfo.groupId;
  } else {
    return (await systemDiscourseClient.groupCreate({ group: groupData }))
      .basic_group.id;
  }
}

async function upsertDiscourseCategory(ctx: Ctx) {
  const { systemDiscourseClient, existingInfo, slug, name, featureTierConfig } =
    ctx;

  // Must set permissions on parent category before child category
  const parentCategory =
    await systemDiscourseClient.categoryAppendGroupPermissions(
      PRIVATE_SUPPORT_CATEGORY_ID,
      {
        [SUPPORT_GROUP_NAME]: PermissionType.CREATE,
        [slug]: PermissionType.SEE, // don't allow creating posts in parent category
      }
    );

  const categoryData: CategoryMutation & { name: string } = {
    name,
    slug,
    parent_category_id: PRIVATE_SUPPORT_CATEGORY_ID,
    color: featureTierConfig.categoryBackgroundColor,
    permissions: {
      [SUPPORT_GROUP_NAME]: PermissionType.CREATE,
      [slug]: PermissionType.CREATE,
    },
    topic_template:
      "What are you trying to do? (please be as specific as possible and include relevant screenshots, code snippets, and reproduction steps)\n" +
      "\n" +
      "What have you tried so far? (please link relevant docs and other forum posts)\n" +
      "\n" +
      "Relevant links:\n" +
      "- My Project: https://studio.plasmic.app/projects/my_project_link\n",
    custom_fields: {
      enable_accepted_answers: "true" as const,
    },
  };
  if (existingInfo) {
    const category = (
      await systemDiscourseClient.categoryUpdate(
        existingInfo.categoryId,
        categoryData
      )
    ).category;
    return {
      parentCategory,
      category,
    };
  } else {
    const category = (await systemDiscourseClient.categoryCreate(categoryData))
      .category;
    return {
      parentCategory,
      category,
    };
  }
}

async function updateDiscourseCategoryWelcomePost(
  { systemDiscourseClient, teamId, slug, name }: Ctx,
  category: Category,
  parentCategory: Category
) {
  const welcomeTopicId = Number(category.topic_url.split("/").pop());
  const welcomeTopic = await systemDiscourseClient.topicGet(welcomeTopicId);
  const welcomePostId = welcomeTopic.post_stream.posts.find(
    (p) => p.post_number === 1
  )?.id;
  if (!welcomePostId) {
    throw new Error(`Couldn't find welcome post in topic ${welcomeTopicId}`);
  }

  await systemDiscourseClient.topicUpdate(welcomeTopicId, {
    title: `👋 Welcome to your support forum!`,
  });
  const post = (
    await systemDiscourseClient.postUpdate(welcomePostId, {
      post: {
        raw:
          `Click [New Topic](${BASE_URL}/new-topic?category=${parentCategory.slug}/${slug}) to create a new support topic. ` +
          `Topics in this category are only visible to members of the [${name}](/g/${slug}) [organization](https://studio.plasmic.app/orgs/${teamId}). ` +
          `For sensitive topics, please directly message the [support team](/g/support).\n` +
          `\n` +
          `Note that the Plasmic team may move topics to a public category for documentation purposes. ` +
          `Sensitive information will be redacted first.\n`,
      },
    })
  ).post;
  await systemDiscourseClient.postRevisionHide(post.id, post.version);
}

async function ensureSupportGroupTrackingCategory(
  { systemDiscourseClient }: Ctx,
  category: Category
) {
  const group = (await systemDiscourseClient.groupGet(SUPPORT_GROUP_NAME))
    .group;
  if (group.watching_category_ids.includes(category.id)) {
    return;
  }

  const newWatchingCategoryIds = [
    ...group.watching_category_ids,
    category.id,
  ].sort();
  await systemDiscourseClient.groupUpdate(group.id, {
    group: {
      watching_category_ids: newWatchingCategoryIds,
    },
    update_existing_users: "true",
  });
}
