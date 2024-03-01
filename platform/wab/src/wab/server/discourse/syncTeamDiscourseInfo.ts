import { DbMgr } from "@/wab/server/db/DbMgr";
import { TeamDiscourseInfo } from "@/wab/server/entities/Entities";
import { PreconditionFailedError } from "@/wab/shared/ApiErrors/errors";
import { TeamId } from "@/wab/shared/ApiSchema";
import {
  DiscourseClient,
  GroupAliasLevel,
  GroupPermissionsMutation,
  GroupVisibilityLevel,
  PermissionType,
} from "@/wab/shared/discourse/DiscourseClient";
import { createSystemDiscourseClient } from "./clients";
import {
  FeatureTierConfig,
  FEATURE_TIERS,
  PRIVATE_SUPPORT_CATEGORY_ID,
  SUPPORT_GROUP_NAME,
} from "./config";

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
  slug: string;
  name: string;
  featureTierConfig: FeatureTierConfig;
}

async function upsertToDiscourse(ctx: Ctx) {
  const groupId = await upsertDiscourseGroup(ctx);
  const { categoryId, parentCategory } = await upsertDiscourseCategory(ctx);
  await updateDiscourseCategoryWelcomePost(ctx, parentCategory.slug);
  return { categoryId, groupId };
}

async function upsertDiscourseGroup(ctx: Ctx) {
  const { systemDiscourseClient, existingInfo, slug, name } = ctx;

  const groupData = {
    name: slug,
    full_name: name,
    members_visibility_level: GroupVisibilityLevel.MEMBERS,
    mentionable_level: GroupAliasLevel.MEMBERS_MODS_AND_ADMINS,
    messageable_level: GroupAliasLevel.NOBODY,
    visibility_level: GroupVisibilityLevel.MEMBERS,
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
  const permissions: GroupPermissionsMutation = {
    [SUPPORT_GROUP_NAME]: PermissionType.CREATE,
    [slug]: PermissionType.CREATE,
  };
  const parentCategory =
    await systemDiscourseClient.categoryAppendGroupPermissions(
      PRIVATE_SUPPORT_CATEGORY_ID,
      permissions
    );

  const categoryData = {
    name,
    slug,
    parent_category_id: PRIVATE_SUPPORT_CATEGORY_ID,
    color: featureTierConfig.categoryBackgroundColor,
    permissions,
    custom_fields: {
      enable_accepted_answers: "true" as const,
    },
  };
  if (existingInfo) {
    await systemDiscourseClient.categoryUpdate(
      existingInfo.categoryId,
      categoryData
    );
    return {
      parentCategory,
      categoryId: existingInfo.categoryId,
    };
  } else {
    const categoryId = (
      await systemDiscourseClient.categoryCreate(categoryData)
    ).category.id;
    return {
      parentCategory,
      categoryId,
    };
  }
}

async function updateDiscourseCategoryWelcomePost(
  { systemDiscourseClient, slug }: Ctx,
  parentCategorySlug: string
) {
  const maybeWelcomePost = (
    await systemDiscourseClient.search(
      `in:pinned @system #${parentCategorySlug}:${slug}`
    )
  ).posts;
  if (maybeWelcomePost.length !== 1) {
    throw new Error(`expected 1 pinned post, found ${maybeWelcomePost.length}`);
  }

  const welcomePost = maybeWelcomePost[0];
  await systemDiscourseClient.topicUpdate(welcomePost.topic_id, {
    title: `👋 Welcome to your support forum!`,
  });
  const post = (
    await systemDiscourseClient.postUpdate(welcomePost.id, {
      post: {
        raw: `Click [New Topic](https://forum.plasmic.app/new-topic?category=${parentCategorySlug}/${slug}) to create a new support topic.`,
      },
    })
  ).post;
  await systemDiscourseClient.postRevisionHide(post.id, post.version);
}
