import { sortBy, withoutNils } from "@/wab/common";
import {
  executeDataSourceOperation,
  getDataSourceOperation,
} from "@/wab/server/data-sources/data-source-utils";
import { getMigratedUserPropsOpBundle } from "@/wab/server/data-sources/end-user-utils";
import { getDevFlagsMergedWithOverrides } from "@/wab/server/db/appconfig";
import { DbMgr, ForbiddenError } from "@/wab/server/db/DbMgr";
import { sendAppEndUserInviteEmail } from "@/wab/server/emails/app-end-user-invite-email";
import {
  AppAccessRegistry,
  AppAuthConfig,
  AppEndUserAccess,
  AppRole,
  DirectoryEndUserGroup,
  EndUser,
  EndUserDirectory,
  EndUserIdentifier,
} from "@/wab/server/entities/Entities";
import { extractAppUserFromToken } from "@/wab/server/routes/app-oauth";
import { mkApiProject } from "@/wab/server/routes/projects";
import { getUser, superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import {
  ApiAppAccessRegistry,
  ApiAppAuthConfig,
  ApiAppAuthPublicConfig,
  ApiAppEndUserAccessRule,
  ApiAppRole,
  ApiAppUser,
  ApiAppUserOpConfig,
  ApiDirectoryEndUserGroup,
  ApiEndUser,
  ApiEndUserDirectory,
  ProjectId,
  TeamId,
} from "@/wab/shared/ApiSchema";
import { GenericDataSource } from "@/wab/shared/data-sources-meta/data-source-registry";
import { OperationTemplate } from "@/wab/shared/data-sources-meta/data-sources";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { prodUrlForProject } from "@/wab/shared/project-urls";
import { Request, Response } from "express-serve-static-core";
import { groupBy, isString, pick, uniq } from "lodash";
import { Connection } from "typeorm";
import validator from "validator";

function mkApiEndUser(
  endUser: EndUser,
  groups: ApiDirectoryEndUserGroup[]
): ApiEndUser {
  return {
    ...pick(endUser, ["id", "email"]),
    groups,
  };
}

export function mkApiAppRole(role: AppRole): ApiAppRole {
  return pick(role, ["id", "name", "order"]);
}

export function mkApiAppEndUserAccess(
  appEndUserAccess: AppEndUserAccess
): ApiAppEndUserAccessRule {
  const identifier = appEndUserAccess.email
    ? {
        email: appEndUserAccess.email,
      }
    : appEndUserAccess.directoryEndUserGroupId
    ? {
        directoryEndUserGroupId: appEndUserAccess.directoryEndUserGroupId,
      }
    : appEndUserAccess.domain
    ? {
        domain: appEndUserAccess.domain,
      }
    : appEndUserAccess.externalId
    ? {
        externalId: appEndUserAccess.externalId,
      }
    : undefined;

  if (!identifier) {
    throw new Error("Invalid app end user access");
  }

  return {
    id: appEndUserAccess.id,
    roleId: appEndUserAccess.roleId,
    properties: {},
    ...identifier,
  };
}

function mkApiEndUserDirectory(
  directory: EndUserDirectory
): ApiEndUserDirectory {
  return pick(directory, ["id", "name"]);
}

function mkApiEndUserGroup(
  directoryGroup: DirectoryEndUserGroup
): ApiDirectoryEndUserGroup {
  return pick(directoryGroup, ["id", "name"]);
}

function mkApiAppAccessRegistry(
  appAccessRegistry: AppAccessRegistry,
  endUser: EndUser,
  matchedRoles: RoleMatchingInfo[]
): ApiAppAccessRegistry {
  return {
    id: appAccessRegistry.id,
    endUserId: appAccessRegistry.endUserId,
    endUserEmail: endUser.email,
    endUserExternalId: endUser.externalId,
    createdAt: appAccessRegistry.createdAt,
    updatedAt: appAccessRegistry.updatedAt,
    matchedRoles: matchedRoles.map(({ accessId, role, reason }) => ({
      role: mkApiAppRole(role),
      reason,
      accessId,
    })),
  };
}

export function mkApiAppAuthConfig(
  appAuthConfig: AppAuthConfig
): ApiAppAuthConfig {
  return pick(appAuthConfig, [
    "id",
    "directoryId",
    "redirectUri",
    "anonymousRoleId",
    "registeredRoleId",
    "provider",
    "token",
    "redirectUris",
  ]);
}

function mkApiAppUserOpConfig(
  appAuthConfig: AppAuthConfig
): ApiAppUserOpConfig {
  return pick(appAuthConfig, [
    "userPropsOpId",
    "userPropsBundledOp",
    "userPropsDataSourceId",
  ]);
}

/**
 * App auth config
 */
export async function getAppAuthConfig(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const config = await mgr.getAppAuthConfig(projectId as ProjectId);
  res.json(config ? mkApiAppAuthConfig(config) : undefined);
}

export async function upsertAppAuthConfig(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const { directoryId, redirectUri, registeredRoleId, provider, redirectUris } =
    req.body;
  const appConfig = await mgr.upsertAppAuthConfig(projectId as ProjectId, {
    directoryId,
    redirectUri,
    registeredRoleId,
    provider,
    redirectUris,
  });
  res.json(mkApiAppAuthConfig(appConfig));
}

export async function getAppCurrentUserOpConfig(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const config = await mgr.getAppAuthConfig(projectId as ProjectId);

  if (!config || !config.userPropsBundledOp) {
    res.json({});
    return;
  }

  const migratedOpBundle = await getMigratedUserPropsOpBundle(
    mgr,
    projectId,
    config.userPropsBundledOp
  );

  const opConfig = mkApiAppUserOpConfig(config);

  res.json({
    ...opConfig,
    userPropsBundledOp: JSON.stringify(migratedOpBundle),
  });
}

export async function upsertCurrentUserOpConfig(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const { userPropsOpId, userPropsBundledOp, userPropsDataSourceId } = req.body;

  const appConfig = await mgr.upsertAppAuthConfig(projectId as ProjectId, {
    userPropsOpId,
    userPropsBundledOp,
    userPropsDataSourceId,
  });
  res.json(mkApiAppUserOpConfig(appConfig));
}

export async function deleteAppAuthConfig(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  await mgr.deleteAppAuthConfig(projectId as ProjectId);
  res.json({});
}

export async function disableAppAuth(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  await mgr.disableAppAuthConfig(projectId as ProjectId);
  res.json({});
}

export async function getAppCurrentUserProperties(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const reqIdentifier = req.body.identifier;
  const identifier = {
    email:
      reqIdentifier.email && isString(reqIdentifier.email)
        ? reqIdentifier.email
        : undefined,
    externalId:
      reqIdentifier.externalId && isString(reqIdentifier.externalId)
        ? reqIdentifier.externalId
        : undefined,
  };
  const userAccessLevel = await mgr.getActorAccessLevelToProject(projectId);

  if (accessLevelRank(userAccessLevel) < accessLevelRank("editor")) {
    // Non editors can only view as themselves including their custom properties
    const userEmail = req.user?.email;
    if (!identifier.email || userEmail !== identifier.email) {
      throw new ForbiddenError("User unauthorized to get user properties");
    }
  }

  const properties = await getCurrentUserDataProperties(
    req.con,
    mgr,
    projectId as ProjectId,
    identifier
  );
  res.json(properties ?? {});
}

async function getCurrentUserDataProperties(
  dbCon: Connection,
  mgr: DbMgr,
  appId: string,
  currentUserIdentifier: EndUserIdentifier
) {
  // We skip permission check because if the currentUser is the current studio user
  // we still want to allow the project to be usuable in studio, permissions checks
  // are done before executing this function
  const appAuthConfig = await mgr.getAppAuthConfig(appId, true);

  if (appAuthConfig?.userPropsOpId) {
    try {
      const dataSource = await mgr.getDataSourceById(
        appAuthConfig.userPropsDataSourceId!,
        {
          skipPermissionCheck: true,
        }
      );

      const op = await getDataSourceOperation(
        mgr,
        appAuthConfig.userPropsDataSourceId!,
        appAuthConfig.userPropsOpId
      );

      const userPropertiesData = (
        await executeDataSourceOperation(
          dbCon,
          dataSource as GenericDataSource,
          op,
          undefined,
          {},
          currentUserIdentifier,
          false
        )
      ).data;

      if (typeof userPropertiesData === "object") {
        if (Array.isArray(userPropertiesData)) {
          return userPropertiesData[0];
        } else {
          return userPropertiesData;
        }
      }
    } catch (e) {}
  }
  return {};
}

export async function getAppUserInfo(
  dbCon: Connection,
  mgr: DbMgr,
  tokenInfo: ReturnType<typeof extractAppUserFromToken>,
  includeCustomProperties = true
): Promise<ApiAppUser | {}> {
  if (!tokenInfo.endUserId || !tokenInfo.appId) {
    return {};
  }

  const endUser = await mgr.getEndUserByIdentifier(
    {
      id: tokenInfo.endUserId,
    },
    tokenInfo.appId
  );

  if (!endUser) {
    return {};
  }

  const userRoleInApp = await getUserRoleForApp(mgr, tokenInfo.appId, {
    email: endUser.email,
    externalId: endUser.externalId,
  });

  if (!userRoleInApp) {
    return {};
  }

  const appRoles = await mgr.listAppRoles(tokenInfo.appId);

  // Include all roles with order <= userRoleInApp.order
  const userRoles = appRoles.filter((r) => r.order <= userRoleInApp.order);

  const extraProperties = includeCustomProperties
    ? await getCurrentUserDataProperties(dbCon, mgr, tokenInfo.appId, {
        email: endUser.email,
        externalId: endUser.externalId,
      })
    : {};

  return {
    email: endUser.email,
    externalId: endUser.externalId,
    roleId: userRoleInApp.id,
    roleName: userRoleInApp.name,
    roleOrder: userRoleInApp.order,
    roleIds: userRoles.map((r) => r.id),
    roleNames: userRoles.map((r) => r.name),
    properties: endUser.properties,
    customProperties: extraProperties ?? {},
    isLoggedIn: true,
  };
}

// Creates a fake user to be used in studio operations
export async function buildFakeCurrentUser(
  dbCon: Connection,
  mgr: DbMgr,
  appId: string,
  identifier: EndUserIdentifier | undefined,
  includeCustomProperties = true
) {
  if (!identifier) {
    return {};
  }

  const roles = await mgr.listAppRoles(appId);
  const userRole = await getUserRoleForApp(mgr, appId, identifier);

  // If user doesn't have access to the app, don't allow a fake user
  if (!userRole) {
    return {};
  }

  const userRoles = roles.filter((r) => r.order <= userRole.order);

  const extraProperties = includeCustomProperties
    ? await getCurrentUserDataProperties(dbCon, mgr, appId, identifier)
    : {};

  return {
    email: identifier.email,
    externalId: identifier.externalId,
    roleId: userRole.id,
    roleName: userRole.name,
    roleOrder: userRole.order,
    roleIds: userRoles.map((r) => r.id),
    roleNames: userRoles.map((r) => r.name),
    // End user may not exist so we can only have properties from the data source op
    properties: {},
    customProperties: extraProperties,
  };
}

function fakeRoleEmailFromRole(role: AppRole) {
  return `${role.name.toLowerCase()}@fakeemail.com`;
}

export async function buildFakeCurrentUserFromRole(
  mgr: DbMgr,
  appId: string,
  roleId: string | undefined
) {
  if (!roleId) {
    return {};
  }

  const roles = await mgr.listAppRoles(appId);
  const role = roles.find((r) => r.id === roleId);

  if (!role) {
    return {};
  }

  const lowerRoles = roles.filter((r) => r.order <= role.order);

  return {
    email: fakeRoleEmailFromRole(role),
    roleId: role.id,
    roleName: role.name,
    roleOrder: role.order,
    roleIds: lowerRoles.map((r) => r.id),
    roleNames: lowerRoles.map((r) => r.name),
    properties: {},
  };
}

export async function getAppAuthPubConfig(req: Request, res: Response) {
  const userEmail = req.user?.email;
  const mgr = superDbMgr(req);
  const { projectId } = req.params;

  const userRole = userEmail
    ? await getUserRoleForApp(mgr, projectId, {
        email: userEmail,
      })
    : undefined;

  const config = await mgr.getPublicAppAuthConfig(projectId as ProjectId);

  const project = await mgr.getProjectById(projectId as ProjectId);

  const pubConfig: ApiAppAuthPublicConfig = {
    allowed: !!userRole,
    appName: project.name,
    isAuthEnabled: !!config,
    authScreenProperties: {},
  };

  res.json(pubConfig);
}

/**
 * Directories
 */
export async function createEndUserDirectory(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { teamId } = req.params;
  const { name } = req.body;
  const directory = await mgr.createEndUserDirectory(teamId as TeamId, name);
  res.json(mkApiEndUserDirectory(directory));
}

export async function listTeamEndUserDirectories(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { teamId } = req.params;
  const directories = await mgr.listTeamEndUserDirectories(teamId as TeamId);
  res.json(directories.map((d) => mkApiEndUserDirectory(d)));
}

export async function getEndUserDirectory(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const directory = await mgr.getEndUserDirectory(directoryId as string);
  res.json(mkApiEndUserDirectory(directory));
}

export async function updateEndUserDirectory(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const { name } = req.body;
  const directory = await mgr.updateEndUserDirectory(directoryId as string, {
    name,
  });
  res.json(mkApiEndUserDirectory(directory));
}

// Find which apps the directory is used in
export async function getEndUserDirectoryApps(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const projects = await mgr.getEndUserDirectoryApps(directoryId as string);
  res.json(projects.map(mkApiProject));
}

export async function deleteDirectory(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  await mgr.deleteEndUserDirectory(directoryId);
  res.json({});
}

export async function getUsersWithGroups(
  mgr: DbMgr,
  directoryId: string,
  users: EndUser[]
): Promise<ApiEndUser[]> {
  const rawUserGroups = await mgr.listEndUsersGroups(
    directoryId as string,
    users.map((u) => u.id)
  );
  const groupIds = new Set(rawUserGroups.map((g) => g.directoryEndUserGroupId));

  const rawDirectoryGroups = await mgr.getDirectoryGroupsByIds([...groupIds]);
  const directoryGroups = new Map(
    rawDirectoryGroups.map((g) => [g.id, g])
  ) as Map<string, DirectoryEndUserGroup>;

  const groups = groupBy(rawUserGroups, (g) => g.endUserId);

  const usersWithGroups = users.map((user) => {
    const rawUserGroup = groups[user.id] ?? [];
    const userGroups = rawUserGroup.map((g) => {
      const directoryGroup = directoryGroups.get(g.directoryEndUserGroupId);
      if (!directoryGroup) {
        // TODO(fmota): ??
        throw new Error("Invalid group");
      }
      return mkApiEndUserGroup(directoryGroup);
    });
    return mkApiEndUser(user, userGroups);
  });

  return usersWithGroups;
}

export async function getDirectoryUsers(req: Request, res: Response) {
  // TODO(fmota): pagination
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const users = await mgr.getDirectoryUsers(directoryId as string);

  const usersWithGroups = await getUsersWithGroups(mgr, directoryId, users);
  res.json(usersWithGroups);
}

export async function addDirectoryEndUsers(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const { emails } = req.body;
  const users = await mgr.addDirectoryEndUsers(directoryId, emails);
  const usersWithGroups = await getUsersWithGroups(mgr, directoryId, users);
  res.json(usersWithGroups);
}

export async function updateEndUserGroups(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId, userId } = req.params;
  const { groupIds } = req.body;
  const currentUserGroups = await mgr.listEndUsersGroups(directoryId, [userId]);
  const currentUserGroupsIds = currentUserGroups.map(
    (g) => g.directoryEndUserGroupId
  );
  const groupsToAdd = groupIds.filter((g) => !currentUserGroupsIds.includes(g));
  const groupsToRemove = currentUserGroupsIds.filter(
    (g) => !groupIds.includes(g)
  );
  await mgr.addEndUserToGroups(directoryId, userId, groupsToAdd);
  await mgr.removeEndUserFromGroups(directoryId, userId, groupsToRemove);
  // TODO(fmota): better way to do this?, build user
  res.json({});
}

export async function removeEndUserFromDirectory(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId, endUserId } = req.params;
  await mgr.removeEndUserFromDirectory(directoryId, endUserId);
  res.json({});
}

/**
 * Roles
 */
export async function createRole(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const appRole = await mgr.createAppRole(projectId as ProjectId, "Editor");
  res.json(mkApiAppRole(appRole));
}

export async function listRoles(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const roles = await mgr.listAppRoles(projectId as ProjectId);
  res.json(roles.map((role) => mkApiAppRole(role)));
}

export async function updateAppRole(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, roleId } = req.params;
  const { name } = req.body;
  const role = await mgr.updateAppRole(roleId as string, name);
  res.json(mkApiAppRole(role));
}

export async function deleteAppRole(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, roleId } = req.params;
  await mgr.deleteAppRole(roleId as string);
  res.json({});
}

export async function changeAppRolesOrder(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const { newOrders } = req.body;
  await mgr.changeAppRolesOrder(projectId as ProjectId, newOrders);
  res.json({});
}

/**
 * User access to an app
 */
export async function listAppAccessRules(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const users = await mgr.listAppAccessRules(projectId);
  res.json(users.map((user) => mkApiAppEndUserAccess(user)));
}

export async function loadProdUrlForProject(mgr: DbMgr, projectId: ProjectId) {
  const project = await mgr.getProjectById(projectId);

  const plasmicHostingDomains = await mgr.getDomainsForProject(projectId);
  const devflags = await getDevFlagsMergedWithOverrides(mgr);
  return prodUrlForProject(devflags, project, plasmicHostingDomains);
}

export async function createAccessRules(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const projectId = req.params.projectId as ProjectId;
  const {
    emails,
    externalIds,
    directoryEndUserGroupIds,
    domains,
    roleId,
    notify,
  } = req.body;
  const validatedEmails = (emails ?? [])
    .map((email) => email.trim().toLowerCase())
    .filter((email) => validator.isEmail(email));

  const validatedDomains = (domains ?? [])
    .map((domain) => domain.trim())
    .filter(
      (domain) =>
        domain.startsWith("@") && validator.isFQDN(domain.substring(1))
    );

  const validatedExternalIds = (externalIds ?? []).filter((externalId) =>
    isString(externalId)
  );

  const users = await mgr.createAccessRules(
    projectId,
    {
      emails: validatedEmails,
      externalIds: validatedExternalIds,
      directoryEndUserGroupIds: directoryEndUserGroupIds ?? [],
      domains: validatedDomains,
    },
    roleId
  );

  if (notify) {
    const project = await mgr.getProjectById(projectId);
    for (const email of validatedEmails) {
      const url = await loadProdUrlForProject(mgr, projectId);
      if (!url) {
        continue;
      }
      await sendAppEndUserInviteEmail(req, {
        sharer: getUser(req),
        email: email,
        url: url,
        appName: project.name,
      });
    }
  }
  res.json(users.map((user) => mkApiAppEndUserAccess(user)));
}

export async function updateAccessRule(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, accessId } = req.params;
  const { roleId } = req.body;
  const user = await mgr.updateAccessRule(projectId, accessId, roleId);
  res.json(mkApiAppEndUserAccess(user));
}

export async function deleteAccessRule(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, accessId } = req.params;
  await mgr.deleteAccessRule(projectId, accessId);
  res.json({});
}

/**
 * Groups
 */

export async function listDirectoryGroups(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const groups = await mgr.getDirectoryGroups(directoryId as string);
  res.json(groups.map((group) => mkApiEndUserGroup(group)));
}

export async function createDirectoryGroup(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId } = req.params;
  const { name } = req.body;
  const group = await mgr.createDirectoryGroup(directoryId as string, name);
  res.json(mkApiEndUserGroup(group));
}

export async function updateDirectoryGroup(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId, groupId } = req.params;
  const { name } = req.body;
  const group = await mgr.updateDirectoryGroup(
    directoryId,
    groupId as string,
    name
  );
  res.json(mkApiEndUserGroup(group));
}

export async function deleteDirectoryGroup(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { directoryId, groupId } = req.params;
  await mgr.deleteDirectoryGroup(directoryId, groupId as string);
  res.json({});
}

/**
 * App access registries
 */

export async function listAppAccessRegistries(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const pageSize = Math.min(
    JSON.parse((req.query.pageSize ?? "20") as string) as number,
    100
  );
  const pageIndex = JSON.parse(
    (req.query.pageIndex ?? "0") as string
  ) as number;
  const search = JSON.parse((req.query.search ?? '""') as string) as string;

  const registries = await mgr.listAppAccessRegistries(
    projectId,
    {
      size: pageSize,
      page: pageIndex,
    },
    search
  );

  const endUserIds = registries.map((registry) => registry.endUserId);
  const endUsers = await mgr.getEndUsersByIds(endUserIds);
  const matchingRolesByEndUserid = new Map(
    await Promise.all(
      endUsers.map(async (user): Promise<[string, RoleMatchingInfo[]]> => {
        const matchingRoles =
          user.email || user.externalId
            ? await getMatchingRolesForUser(mgr, projectId, {
                email: user.email,
                externalId: user.externalId,
              })
            : [];
        return [user.id.toString(), matchingRoles!];
      })
    )
  );
  const endUsersById = new Map(
    endUsers.map((user) => [user.id.toString(), user])
  );
  res.json({
    accesses: registries.map((registry) =>
      mkApiAppAccessRegistry(
        registry,
        endUsersById.get(registry.endUserId)!,
        matchingRolesByEndUserid.get(registry.endUserId)!
      )
    ),
    total: await mgr.countAppAccessRegistries(projectId, search),
  });
}

export async function deleteAppAccessRegister(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, accessId } = req.params;
  await mgr.deleteAppAccessRegister(projectId, accessId);
  res.json({});
}

// Extract fields that should be present in currentUser from a role
function getRolesFields(role: AppRole, roles: AppRole[]) {
  const lowerRoles = roles.filter((r) => r.order <= role.order);
  return {
    roleId: role.id,
    roleName: role.name,
    roleOrder: role.order,
    roleIds: lowerRoles.map((r) => r.id),
    roleNames: lowerRoles.map((r) => r.name),
  };
}

/**
buildCurrentUserFromEmail only checks the user access to the app
it skips the directory permissions check, it's assumed that it's
safe to build the user from the email because the user has access
to the app or is the current user
*/
async function buildCurrentUserFromEmail(
  dbCon: Connection,
  mgr: DbMgr,
  projectId: string,
  userEmail: string,
  roles: AppRole[]
): Promise<ApiAppUser | undefined> {
  const role = await getUserRoleForApp(mgr, projectId, {
    email: userEmail,
  });
  if (!role) {
    return undefined;
  }
  const endUser = await mgr.getEndUserByIdentifier(
    {
      email: userEmail,
    },
    projectId,
    {
      skipDirectoryPermsCheck: true,
    }
  );
  const extraProperties = await getCurrentUserDataProperties(
    dbCon,
    mgr,
    projectId,
    {
      email: userEmail,
    }
  );

  return {
    email: userEmail,
    externalId: endUser?.externalId,
    properties: endUser?.properties ?? {},
    customProperties: extraProperties,
    ...getRolesFields(role, roles),
    isLoggedIn: true,
  };
}

// List app users to be used by View As
export async function listAppUsers(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  const roles = await mgr.listAppRoles(projectId);

  const userAccessLevel = await mgr.getActorAccessLevelToProject(projectId);

  if (accessLevelRank(userAccessLevel) < accessLevelRank("editor")) {
    const appUsers: ApiAppUser[] = [];

    // Non editors can only see themselves
    const userEmail = req.user?.email;
    if (userEmail) {
      const appUser = await buildCurrentUserFromEmail(
        req.con,
        mgr,
        projectId,
        userEmail,
        roles
      );
      if (appUser) {
        appUsers.push(appUser);
      }
    }

    res.json({
      rolesAsUsers: [],
      appUsers,
    });
    return;
  }

  // Get emails from access rules to ease the process of viewing as a user
  const emailRules = await mgr.listEmailAccessRules(projectId);

  const accessRegistries = await mgr.listAppAccessRegistries(
    projectId,
    {
      size: 10,
      page: 0,
    },
    ""
  );
  const endUsers = await mgr.getEndUsersByIds(
    accessRegistries.map((r) => r.endUserId)
  );

  const userEmails = uniq(
    [
      ...emailRules.map((rule) => rule.email),
      ...endUsers.map((user) => user.email),
    ].filter((email): email is string => !!email)
  );

  const appUsers = await Promise.all(
    userEmails.map(
      async (email): Promise<ApiAppUser | undefined> =>
        buildCurrentUserFromEmail(req.con, mgr, projectId, email, roles)
    )
  );

  res.json({
    // Disable roles as users for now
    rolesAsUsers: [],
    appUsers: sortBy(withoutNils(appUsers), (user) => user.email),
  });
}

export async function getInitialUserToViewAs(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;

  const userAccessLevel = await mgr.getActorAccessLevelToProject(projectId);

  if (accessLevelRank(userAccessLevel) < accessLevelRank("editor")) {
    const userEmail = req.user?.email;
    if (userEmail) {
      const roles = await mgr.listAppRoles(projectId);
      res.json({
        initialUser: await buildCurrentUserFromEmail(
          req.con,
          mgr,
          projectId,
          userEmail,
          roles
        ),
      });
    } else {
      res.json({
        initialUser: undefined,
      });
    }
  } else {
    const emailRule = await mgr.getOldestAppEmailAccessRule(projectId);
    if (emailRule?.email) {
      const roles = await mgr.listAppRoles(projectId);
      res.json({
        initialUser: await buildCurrentUserFromEmail(
          req.con,
          mgr,
          projectId,
          emailRule.email,
          roles
        ),
      });
    } else {
      res.json({
        initialUser: undefined,
      });
    }
  }
}

export async function checkPermissionToPerformOperationAsUser(
  req: Request,
  mgr: DbMgr,
  projectId: string,
  identifier: EndUserIdentifier
) {
  // If no identifier, allowed
  if (!identifier.email && !identifier.externalId) {
    return true;
  }

  const userAccessLevel = await mgr.getActorAccessLevelToProject(projectId);

  if (accessLevelRank(userAccessLevel) < accessLevelRank("editor")) {
    // Non editors can only perform operations as themselves
    const userEmail = identifier.email;
    if (!userEmail) {
      // Trying to execute as externalId
      return false;
    }
    return userEmail === req.user?.email;
  } else {
    // Editors can perform operations as anyone
    return true;
  }
}

/**
 * User Role
 */
export async function getUserRoleInApp(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, endUserId } = req.params;
  const [endUser] = await mgr.getEndUsersByIds([endUserId as string]);
  const role = endUser?.email
    ? await getUserRoleForApp(mgr, projectId, {
        email: endUser?.email,
      })
    : undefined;
  res.json(role ? mkApiAppRole(role) : undefined);
}

interface RoleMatchingInfo {
  accessId: string;
  reason: ApiAppAccessRegistry["matchedRoles"][0]["reason"];
  role: AppRole;
}

export async function getMatchingRolesForUser(
  mgr: DbMgr,
  appId: string,
  identifier: EndUserIdentifier
): Promise<RoleMatchingInfo[]> {
  const appAuthConfig = await mgr.getPublicAppAuthConfig(appId);
  if (!appAuthConfig) {
    return [];
  }

  const matchedRoles: RoleMatchingInfo[] = [];

  if (appAuthConfig.registeredRole) {
    matchedRoles.push({
      role: appAuthConfig.registeredRole,
      reason: "general-access",
      accessId: "general-access",
    });
  }

  if (identifier.email) {
    const domain = `@${identifier.email.split("@")[1]}`;
    const accessByDomain = await mgr.getAppEndUserAccessByIdentifier(appId, {
      domain,
    });

    if (accessByDomain && accessByDomain.role) {
      matchedRoles.push({
        role: accessByDomain.role,
        reason: "domain",
        accessId: accessByDomain.id,
      });
    }

    const accessByEmail = await mgr.getAppEndUserAccessByIdentifier(appId, {
      email: identifier.email,
    });

    if (accessByEmail && accessByEmail.role) {
      matchedRoles.push({
        role: accessByEmail.role,
        reason: "email",
        accessId: accessByEmail.id,
      });
    }
  }

  if (identifier.externalId) {
    const accessByExternalId = await mgr.getAppEndUserAccessByIdentifier(
      appId,
      {
        externalId: identifier.externalId,
      }
    );

    if (accessByExternalId && accessByExternalId.role) {
      matchedRoles.push({
        role: accessByExternalId.role,
        reason: "external-id",
        accessId: accessByExternalId.id,
      });
    }
  }

  const directoryId = appAuthConfig.directoryId;
  const endUser = await mgr.getEndUserByIdentifier(identifier, appId, {
    // It will be considered that to evaluate the role of the user in the app
    // it won't require the user to have access to the directory, this way
    // the user can visualize the app even if he doesn't have access to the
    // directory/team.
    skipDirectoryPermsCheck: true,
  });

  if (directoryId && endUser) {
    const endUserGroups = await mgr.listEndUsersGroups(
      directoryId,
      [endUser.id],
      {
        skipDirectoryPermsCheck: true,
      }
    );

    if (endUserGroups.length > 0) {
      const endUserGroupsIds = endUserGroups.map(
        (group) => group.directoryEndUserGroupId
      );
      const accessesByGroup = await mgr.getAppEndUserAccessByGroups(
        appId,
        endUserGroupsIds
      );
      matchedRoles.push(
        ...accessesByGroup
          .filter((a) => !!a.role)
          .map(
            (access): RoleMatchingInfo => ({
              role: access.role!,
              reason: "group",
              accessId: access.id,
            })
          )
      );
    }
  }

  return matchedRoles;
}

export async function getUserRoleForApp(
  mgr: DbMgr,
  appId: string,
  identifier: EndUserIdentifier
): Promise<AppRole | undefined> {
  const matchedRoles = (
    await getMatchingRolesForUser(mgr, appId, identifier)
  ).map((r) => r.role);

  if (matchedRoles.length === 0) {
    return undefined;
  }

  const highestRole = matchedRoles.reduce((acc, role) => {
    if (acc.order < role.order) {
      return role;
    }
    return acc;
  }, matchedRoles[0]);

  return highestRole;
}

/**
 * End user executing operation
 */
export async function canCurrentUserExecuteOperation(
  mgr: DbMgr,
  appId: string,
  currentUser: Awaited<ReturnType<typeof getAppUserInfo>>,
  op: OperationTemplate
) {
  if (!op.roleId) {
    // No role requirement, then the operation can be considered public
    return true;
  }

  const appAuthConfig = await mgr.getPublicAppAuthConfig(appId);
  if (!appAuthConfig) {
    // If there is no auth config, we deny access, since a role is required by the operation
    // This can happen if we have a mismatch between the app and the operation
    return false;
  }

  const role = await mgr.getAppRole(appId, op.roleId);
  if (!role) {
    // Invalid role id, we deny access, this can happen if we have a mismatch between the app and the operation
    return false;
  }

  // Anonymous always has order 0, so we can execute this operation
  if (role.order === 0) {
    return true;
  }

  const hasEmail = "email" in currentUser && !!currentUser.email;
  const hasExternalId = "externalId" in currentUser && !!currentUser.externalId;

  if (!hasEmail && !hasExternalId) {
    // User is not logged in
    return false;
  }

  return (
    currentUser.roleOrder >= role.order &&
    // We double check that the operation role is in the list of roles the user has, this is to prevent a mismatch between the app and the operation
    currentUser.roleIds.includes(op.roleId)
  );
}

/**
 * This function should only be used during operations performed as role in the studio
 */
export async function canRoleExecuteOperation(
  mgr: DbMgr,
  appId: string,
  roleId: string,
  op: OperationTemplate
) {
  if (!op.roleId) {
    // No role requirement, then the operation can be considered public
    return true;
  }

  const appAuthConfig = await mgr.getPublicAppAuthConfig(appId);
  if (!appAuthConfig) {
    // If there is no auth config, we deny access, since a role is required by the operation
    // This can happen if we have a mismatch between the app and the operation
    return false;
  }

  const role = await mgr.getAppRole(appId, op.roleId);
  if (!role) {
    // Invalid role id, we deny access, this can happen if we have a mismatch between the app and the operation
    return false;
  }

  // Anonymous always has order 0, so we can execute this operation
  if (role.order === 0) {
    return true;
  }

  const currentUserRole = await mgr.getAppRole(appId, roleId);
  if (!currentUserRole) {
    // User doesn't have a role
    return false;
  }

  return currentUserRole.order >= role.order;
}
