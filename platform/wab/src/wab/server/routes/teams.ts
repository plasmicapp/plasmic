import { ForbiddenError, checkPermissions } from "@/wab/server/db/DbMgr";
import { prepareTeamSupportUrls as doPrepareTeamSupportUrls } from "@/wab/server/discourse/prepareTeamSupportUrls";
import { sendShareEmail } from "@/wab/server/emails/share-email";
import { Project, Team, Workspace } from "@/wab/server/entities/Entities";
import { isTeamOnFreeTrial } from "@/wab/server/freeTrial";
import { customCreateTeam } from "@/wab/server/routes/custom-routes";
import { mkApiProject } from "@/wab/server/routes/projects";
import { getPromotionCodeCookie } from "@/wab/server/routes/promo-code";
import {
  maybeTriggerPaywall,
  passPaywall,
  resetStripeCustomer,
  syncDataWithStripe,
} from "@/wab/server/routes/team-plans";
import {
  commitTransaction,
  getUser,
  rollbackTransaction,
  startTransaction,
  superDbMgr,
  userDbMgr,
} from "@/wab/server/routes/util";
import { mkApiWorkspace } from "@/wab/server/routes/workspaces";
import {
  ApiPermission,
  ApiTeam,
  ApiTeamMeta,
  CreateTeamRequest,
  CreateTeamResponse,
  GetTeamResponse,
  Grant,
  GrantRevokeRequest,
  GrantRevokeResponse,
  JoinTeamRequest,
  JoinTeamResponse,
  ListFeatureTiersResponse,
  ListTeamProjectsResponse,
  ListTeamWorkspacesResponse,
  ListTeamsResponse,
  MayTriggerPaywall,
  PurgeUserFromTeamRequest,
  Revoke,
  TeamId,
  TeamMember,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import {
  ensure,
  ensureType,
  filterFalsy,
  uncheckedCast,
  xGroupBy,
} from "@/wab/shared/common";
import {
  ResourceId,
  ResourceType,
  createTaggedResourceId,
  pluralizeResourceId,
} from "@/wab/shared/perms";
import { mergeUiConfigs } from "@/wab/shared/ui-config-utils";
import {
  createProjectUrl,
  createTeamUrl,
  createWorkspaceUrl,
} from "@/wab/shared/urls";
import { Request, Response } from "express-serve-static-core";
import L from "lodash";

export function mkApiTeam(team: Team): ApiTeam {
  return L.assign(
    L.pick(team, [
      "createdAt",
      "updatedAt",
      "deletedAt",
      "createdById",
      "updatedById",
      "deletedById",
      "personalTeamOwnerId",
      "id",
      "name",
      "billingEmail",
      "seats",
      "featureTierId",
      "stripeCustomerId",
      "stripeSubscriptionId",
      "billingFrequency",
      "trialStartDate",
      "trialDays",
      "inviteId",
      "defaultAccessLevel",
      "whiteLabelInfo",
      "whiteLabelName",
    ]),
    {
      parentTeamId: team.parentTeamId,
      featureTier: team.featureTier || team.parentTeam?.featureTier || null,
      uiConfig: mergeUiConfigs(team.parentTeam?.uiConfig, team.uiConfig),
      onTrial: isTeamOnFreeTrial(team),
    }
  );
}

export async function listCurrentFeatureTiers(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const includeLegacyTiers = req.query.includeLegacyTiers
    ? (JSON.parse(req.query.includeLegacyTiers as string) as boolean)
    : undefined;
  const tiers = await mgr.listCurrentFeatureTiers([
    ...req.devflags.newFeatureTierNames,
    ...(includeLegacyTiers ? req.devflags.featureTierNames.slice(0, -1) : []),
  ]);
  res.json(ensureType<ListFeatureTiersResponse>({ tiers }));
}

export async function listTeams(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const teams = await userMgr.getAffiliatedTeams();
  const perms = await userMgr.getPermissionsForTeams(teams.map((t) => t.id));
  const apiTeams = teams.map((team) => mkApiTeam(team));
  res.json(ensureType<ListTeamsResponse>({ teams: apiTeams, perms }));
}

export async function createTeam(req: Request, res: Response) {
  if (await customCreateTeam(req, res)) {
    return;
  }

  const userMgr = userDbMgr(req);
  const superMgr = superDbMgr(req);
  const { name: rawName } = uncheckedCast<CreateTeamRequest>(req.body);
  const teamName = rawName
    ? rawName
    : `${ensure(req.user, "User must be authenticated").firstName}'s Team`;
  const promotionCode = getPromotionCodeCookie(req);
  const extendedFreeTrial = promotionCode
    ? (await superMgr.getPromotionCodeById(promotionCode.id))?.trialDays
    : undefined;

  const team = await userMgr.createTeam(teamName, { extendedFreeTrial });
  await userMgr.updateUser({
    id: getUser(req).id,
    needsTeamCreationPrompt: false,
  });
  const apiTeam = mkApiTeam(team);

  if (req.devflags.freeTrial) {
    await userMgr.startFreeTrial({
      teamId: team.id,
      featureTierName: req.devflags.freeTrialTierName,
    });
  }

  // Automatically create a new workspace in the new team.
  await userMgr.createWorkspace({
    name: "Workspace",
    description: "My first workspace",
    teamId: team.id,
  });

  req.analytics.track("Create team", {
    teamName: teamName,
  });
  if (promotionCode) {
    res.clearCookie("promo_code");
  }
  res.json(ensureType<CreateTeamResponse>({ team: apiTeam }));
}

export async function updateTeam(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const team = await userMgr.updateTeam({
    id: req.params.teamId,
    ...req.body,
  });

  await syncDataWithStripe(team, req.config.host);

  const apiTeam = mkApiTeam(team);
  res.json(ensureType<CreateTeamResponse>({ team: apiTeam }));
}

export async function deleteTeam(req: Request, res: Response) {
  const { teamId } = req.params as { teamId: TeamId };
  const userMgr = userDbMgr(req);
  const superMgr = superDbMgr(req);
  const team = await userMgr.getTeamById(teamId);
  // Cancel any active subscriptions first
  await resetStripeCustomer(userMgr, superMgr, team);

  req.analytics.track("Delete team", {
    teamName: team.name,
  });
  await userMgr.deleteTeam(teamId);
  res.json({ deletedId: teamId });
}

export async function getTeamById(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const { teamId } = uncheckedCast<{ teamId: TeamId }>(req.params);
  const team = await userMgr.getTeamById(teamId);
  const apiTeam = mkApiTeam(team);
  const perms = await userMgr.getPermissionsForTeams([teamId]);
  const members = await userMgr.getTeamMembers(teamId);
  res.json(ensureType<GetTeamResponse>({ team: apiTeam, perms, members }));
}

export async function getTeamMeta(req: Request, res: Response) {
  const { teamId } = uncheckedCast<{ teamId: TeamId }>(req.params);
  const userMgr = userDbMgr(req);
  const meta = await userMgr.getTeamMeta(teamId);
  res.json(ensureType<{ meta: ApiTeamMeta }>({ meta }));
}

export async function changeResourcePermissions(req: Request, res: Response) {
  const { commit, rollback } = await startTransaction<
    MayTriggerPaywall<GrantRevokeResponse>,
    MayTriggerPaywall<GrantRevokeResponse>
  >(req, async () => {
    const mgr = userDbMgr(req);
    const { grants, revokes, requireSignUp } =
      uncheckedCast<GrantRevokeRequest>(req.body);
    const host = req.config.host;
    const resourcesById: Record<string, Team | Workspace | Project> = {};
    const emailsToSend: {
      email: string;
      resourceType: ResourceType;
      resourceName: string;
      resourceUrl: string;
    }[] = [];

    // Grants
    const handleGrant = async (
      type: ResourceType,
      getId: (r: Grant) => ResourceId | undefined
    ) => {
      const grantsById = xGroupBy(grants, getId);
      for (const [id, toGrant] of grantsById) {
        // Skip irrelevant grants
        if (!id) {
          continue;
        }

        const taggedResourceId = createTaggedResourceId(type, id);

        const resource =
          taggedResourceId.type === "project"
            ? await mgr.getProjectById(taggedResourceId.id)
            : taggedResourceId.type === "workspace"
            ? await mgr.getWorkspaceById(taggedResourceId.id)
            : await mgr.getTeamById(taggedResourceId.id);
        resourcesById[taggedResourceId.id] = resource;
        const resourceUrl =
          taggedResourceId.type === "project"
            ? createProjectUrl(host, id)
            : taggedResourceId.type === "workspace"
            ? createWorkspaceUrl(host, id)
            : createTeamUrl(host, id);

        for (const { email, accessLevel } of toGrant) {
          await mgr.grantResourcesPermissionByEmail(
            pluralizeResourceId(taggedResourceId),
            email,
            accessLevel,
            requireSignUp
          );
          req.analytics.track("Share resource", {
            type,
            id,
            name: resource.name,
            email,
            accessLevel,
          });

          // Note: we intentionally do not check whether this is a new permission or
          // not. We always re-send share emails if the user re-requested sharing with
          // a user!
          emailsToSend.push({
            email: email,
            resourceType: type,
            resourceName: resource.name,
            resourceUrl: resourceUrl,
          });
        }
      }
    };
    await handleGrant("project", (g) => g.projectId);
    await handleGrant("workspace", (g) => g.workspaceId);
    await handleGrant("team", (g) => g.teamId);

    // Revokes
    const handleRevoke = async (
      type: ResourceType,
      getId: (r: Revoke) => ResourceId | undefined
    ) => {
      const revokesById = xGroupBy(revokes, getId);
      for (const [id, toRevoke] of revokesById) {
        // Skip irrelevant revokes
        if (!id) {
          continue;
        }
        const taggedResourceId = createTaggedResourceId(type, id);

        const resource =
          taggedResourceId.type === "project"
            ? await mgr.getProjectById(taggedResourceId.id)
            : taggedResourceId.type === "workspace"
            ? await mgr.getWorkspaceById(taggedResourceId.id)
            : await mgr.getTeamById(taggedResourceId.id);
        resourcesById[taggedResourceId.id] = resource;
        const emails = toRevoke.map(({ email }) => email);
        await mgr.revokeResourcesPermissionsByEmail(
          pluralizeResourceId(taggedResourceId),
          emails
        );
      }
    };
    await handleRevoke("project", (r) => r.projectId);
    await handleRevoke("workspace", (r) => r.workspaceId);
    await handleRevoke("team", (r) => r.teamId);

    // Get the final permissions of affected resources
    const getUniqueAffectedIds = (
      getId: (r: Grant | Revoke) => ResourceId | undefined
    ) => L.uniq(filterFalsy([...grants.map(getId), ...revokes.map(getId)]));
    const projectIds = getUniqueAffectedIds((x) => x.projectId);
    const workspaceIds = getUniqueAffectedIds(
      (x) => x.workspaceId
    ) as WorkspaceId[];
    const teamIds = getUniqueAffectedIds((x) => x.teamId) as TeamId[];
    const perms = [
      ...(await mgr.getPermissionsForProjects(projectIds)),
      ...(await mgr.getPermissionsForWorkspaces(workspaceIds)),
      ...(await mgr.getPermissionsForTeams(teamIds)),
    ];

    // Bypass paywall if no grants. This is to always allow revoking permissions.
    const passResponse = { perms };
    if (grants.length === 0) {
      return commitTransaction(passPaywall(passResponse));
    }

    const affectedResourceIds = [
      ...L.uniq(
        filterFalsy([
          ...projectIds.map(
            (id) => (resourcesById[id] as Project).workspace?.teamId
          ),
          ...workspaceIds.map((id) => (resourcesById[id] as Workspace).teamId),
          ...teamIds,
        ])
      ).map((id) => createTaggedResourceId("team", id)),
      ...projectIds.map((id) => createTaggedResourceId("project", id)),
    ];
    const paywall = await maybeTriggerPaywall<GrantRevokeResponse>(
      req,
      affectedResourceIds,
      {},
      passResponse
    );
    if (paywall.paywall == "pass" && !req.apiTeam?.whiteLabelInfo) {
      const promises = emailsToSend.map(
        async (x) =>
          await sendShareEmail(
            req,
            getUser(req),
            x.email,
            x.resourceType,
            x.resourceName,
            x.resourceUrl,
            !!(await mgr.tryGetUserByEmail(x.email))
          )
      );
      await Promise.all(promises);
    }
    if (paywall.paywall === "pass") {
      return commitTransaction(paywall);
    } else {
      return rollbackTransaction(paywall);
    }
  });

  const finalResponse: MayTriggerPaywall<GrantRevokeResponse> =
    rollback ?? commit;
  res.json(finalResponse);
}

export async function joinTeam(req: Request, res: Response) {
  const { teamId, inviteId } = uncheckedCast<JoinTeamRequest>(req.body);

  const { commit, rollback } = await startTransaction<
    JoinTeamResponse,
    JoinTeamResponse
  >(req, async () => {
    const mgr = userDbMgr(req);
    const superMgr = superDbMgr(req);
    const team = await superMgr.getTeamById(teamId);
    if (team.inviteId !== inviteId) {
      return rollbackTransaction({
        status: false,
        reason: "Invalid invite link",
      });
    }
    if (!team.defaultAccessLevel) {
      return rollbackTransaction({
        status: false,
        reason: "Invite link is disabled for this team",
      });
    }
    const taggedResourceId = createTaggedResourceId("team", teamId);
    await mgr.grantTeamPermissionToSelf(team, team.defaultAccessLevel);
    const response = await maybeTriggerPaywall(req, [taggedResourceId], {}, {});
    if (response.paywall === "pass") {
      return commitTransaction({
        status: true,
      });
    } else {
      return rollbackTransaction({
        status: false,
        reason:
          "Team doesn't have enough seats for a new member, ask team owner to upgrade",
      });
    }
  });

  const response: JoinTeamResponse = rollback ?? commit;
  res.json(response);
}

/**
 * If an admin doesn't want to pay for a user anymore, call this to remove them
 * from all resources in the team resource tree
 */
export async function purgeUsersFromTeam(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { teamId, emails } = uncheckedCast<PurgeUserFromTeamRequest>(req.body);

  // Remove team permissions
  const team = await mgr.getTeamById(teamId);
  await mgr.revokeTeamPermissionsByEmails(team.id, emails);

  // Remove workspace permissions
  const workspaces = await mgr.getWorkspacesByTeams([teamId]);
  const workspaceIds = workspaces.map((w) => w.id);
  for (const wid of workspaceIds) {
    await mgr.revokeWorkspacePermissionsByEmails(wid, emails, true);
  }

  // Remove project permissions
  const projects = await mgr.getProjectsByWorkspaces(workspaceIds);
  const projectIds = projects.map((p) => p.id);
  for (const pid of projectIds) {
    await mgr.revokeProjectPermissionsByEmails(pid, emails, true);
  }

  res.json({});
}

export async function getTeamProjects(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const superMgr = superDbMgr(req);
  const { teamId } = uncheckedCast<{ teamId: TeamId }>(req.params);

  // User may not have permission in the team, but only in a workspace
  // in the team. In that case this function return the projects that
  // the user have access, but no meta data about the team such as perms,
  // workspaces and projects that the user can't access.

  const team = await superMgr.getTeamById(teamId);
  const apiTeam = mkApiTeam(team);

  let members: TeamMember[] = [];
  let teamPerms: ApiPermission[] = [];
  try {
    teamPerms = await userMgr.getPermissionsForTeams([teamId]);
    members = await userMgr.getTeamMembers(teamId);
  } catch (err) {
    if (!(err instanceof ForbiddenError)) {
      throw err;
    }
  }

  const workspaces = await userMgr.getAffiliatedWorkspaces(teamId);
  const workspacePerms = await userMgr.getPermissionsForWorkspaces(
    workspaces.map((workspace) => workspace.id),
    true
  );
  const apiWorkspaces = workspaces.map((w) => mkApiWorkspace(w));

  checkPermissions(
    teamPerms.length > 0 || workspaces.length > 0,
    `User does not have access to team or any of its workspaces.`
  );

  const projects = await userMgr.getAffiliatedProjects(teamId);
  const projectPerms = await userMgr.getPermissionsForProjects(
    projects.map((project) => project.id),
    true
  );
  const apiProjects = projects.map((p) => mkApiProject(p));

  res.json(
    ensureType<ListTeamProjectsResponse>({
      team: apiTeam,
      workspaces: apiWorkspaces,
      projects: apiProjects,
      perms: [...teamPerms, ...workspacePerms, ...projectPerms],
      members,
    })
  );
}

export async function getTeamWorkspaces(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const superMgr = superDbMgr(req);
  const { teamId } = uncheckedCast<{ teamId: TeamId }>(req.params);

  // User may not have permission in the team, but only in a workspace
  // in the team. In that case this function return the projects that
  // the user have access, but no meta data about the team such as perms,
  // workspaces and projects that the user can't access.

  const team = await superMgr.getTeamById(teamId);
  const apiTeam = mkApiTeam(team);

  let teamPerms: ApiPermission[] = [];
  try {
    teamPerms = await userMgr.getPermissionsForTeams([teamId]);
  } catch (err) {
    if (!(err instanceof ForbiddenError)) {
      throw err;
    }
  }

  const workspaces = await userMgr.getAffiliatedWorkspaces(teamId);
  const workspacePerms = await userMgr.getPermissionsForWorkspaces(
    workspaces.map((workspace) => workspace.id),
    true
  );
  const apiWorkspaces = workspaces.map((w) => mkApiWorkspace(w));

  checkPermissions(
    teamPerms.length > 0 || workspaces.length > 0,
    `User does not have access to team or any of its workspaces.`
  );

  res.json(
    ensureType<ListTeamWorkspacesResponse>({
      team: apiTeam,
      workspaces: apiWorkspaces,
      perms: [...teamPerms, ...workspacePerms],
    })
  );
}

export async function listTeamTokens(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const teamId = req.params.teamId as TeamId;
  const tokens = await mgr.listTeamApiTokens(teamId);
  res.json({ tokens });
}

export async function createTeamToken(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const teamId = req.params.teamId as TeamId;
  const token = await mgr.createTeamApiToken(teamId);
  res.json({ token });
}

export async function revokeTeamToken(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const tokenStr = req.params.token;
  await mgr.revokeTeamApiToken(tokenStr);
  res.json({});
}

export async function prepareTeamSupportUrls(req: Request, res: Response) {
  const user = getUser(req);
  const mgr = userDbMgr(req);
  const teamId = req.params.teamId as TeamId;
  res.json(await doPrepareTeamSupportUrls(mgr, user, teamId));
}
