import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  createSystemDiscourseClient,
  createUserDiscourseClient,
} from "@/wab/server/discourse/clients";
import { User } from "@/wab/server/entities/Entities";
import { logger } from "@/wab/server/observability";
import { ApiTeamSupportUrls, TeamId } from "@/wab/shared/ApiSchema";
import {
  Group as DiscourseGroup,
  DiscourseHttpError,
  User as DiscourseUser,
} from "@/wab/shared/discourse/DiscourseClient";
import {
  BASE_URL,
  PUBLIC_SUPPORT_CATEGORY_ID,
} from "@/wab/shared/discourse/config";

/**
 * Prepares URLs for the org's private support category.
 * If the org isn't on a feature tier with private support category,
 * they will only receive the URL for the public support category.
 *
 * Currently private support category requires admin setup.
 * TODO: Auto-setup private support category if not set up yet.
 *
 * This function also takes care of ensuring the current user
 * has the proper Discourse group membership/ownership.
 */
export async function prepareTeamSupportUrls(
  dbMgr: DbMgr,
  user: User,
  teamId: TeamId
): Promise<ApiTeamSupportUrls> {
  const systemDiscourseClient = createSystemDiscourseClient();

  // If there's no team Discourse info, then they can only use the public support category.
  const publicSupportUrl = `${BASE_URL}/c/${PUBLIC_SUPPORT_CATEGORY_ID}`;
  const team = await dbMgr.getTeamById(teamId);
  const info = await dbMgr.getDiscourseInfoByTeamId(teamId);
  if (!info) {
    return {
      publicSupportUrl,
    };
  }
  // This link forces sign in, then redirects to their private support category.
  // https://meta.discourse.org/t/configure-single-sign-on-sso-with-wp-discourse-and-discourseconnect/223494#creating-an-discourseconnect-login-link-8
  const privateSupportUrl = `${BASE_URL}/session/sso?return_path=/c/${info.categoryId}`;

  // If the user has no Discourse user, there's nothing to do.
  // When the user is redirected to the private support category,
  // DiscourseConnect will set up their Discourse user and also
  // add group membership with `add_groups`.
  // One issue is that `add_groups` can't be used for group owners.
  // This will be fixed the next time they visit this redirect.
  let discourseUser: DiscourseUser;
  try {
    discourseUser = (await systemDiscourseClient.userGetByExternalId(user.id))
      .user;
  } catch {
    return {
      publicSupportUrl,
      privateSupportUrl,
    };
  }

  // Otherwise, user has a Discourse user already.
  // Check their membership/ownership and grant access if applicable.
  let group: DiscourseGroup;
  let isMember: boolean;
  let isOwner: boolean;
  try {
    const userDiscourseClient = createUserDiscourseClient(
      discourseUser.username
    );
    group = (await userDiscourseClient.groupGet(info.slug)).group;
    isMember = group.is_group_user;
    isOwner = group.is_group_owner;
  } catch (error: unknown) {
    if (error instanceof DiscourseHttpError && error.status === 404) {
      group = (await systemDiscourseClient.groupGet(info.slug)).group;
      isMember = false;
      isOwner = false;
    } else {
      throw error;
    }
  }

  const shouldBeOwner = team.createdById === user.id;
  if (shouldBeOwner && !isOwner) {
    await systemDiscourseClient.groupAddOwners(group.id, {
      usernames: discourseUser.username,
    });
    logger().info(
      `Added ${discourseUser.username} as owner of group ${group.name}`
    );
  } else if (!isMember) {
    await systemDiscourseClient.groupAddMembers(group.id, {
      usernames: discourseUser.username,
    });
    logger().info(
      `Added ${discourseUser.username} as member of group ${group.name}`
    );
  }

  return {
    publicSupportUrl,
    privateSupportUrl,
  };
}
