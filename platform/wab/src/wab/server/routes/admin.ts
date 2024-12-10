import { doLogin } from "@/wab/server/auth/util";
import {
  PkgVersion,
  ProjectRevision,
  PromotionCode,
} from "@/wab/server/entities/Entities";
import "@/wab/server/extensions.ts";
import { mkApiDataSource } from "@/wab/server/routes/data-source";
import {
  mkApiAppAuthConfig,
  mkApiAppEndUserAccess,
  mkApiAppRole,
} from "@/wab/server/routes/end-user";
import {
  doSafelyDeleteProject,
  mkApiProject,
} from "@/wab/server/routes/projects";
import { getUser, superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import {
  TutorialType,
  resetTutorialDb as doResetTutorialDb,
} from "@/wab/server/tutorialdb/tutorialdb-utils";
import { BadRequestError, NotFoundError } from "@/wab/shared/ApiErrors/errors";
import {
  ApiFeatureTier,
  ApiTeamDiscourseInfo,
  DataSourceId,
  FeatureTierId,
  ListFeatureTiersResponse,
  ListUsersResponse,
  LoginResponse,
  PkgVersionId,
  ProjectId,
  SendEmailsResponse,
  TeamId,
  TutorialDbId,
  UpdateSelfAdminModeRequest,
  UserId,
} from "@/wab/shared/ApiSchema";
import { Bundle } from "@/wab/shared/bundler";
import {
  assert,
  ensure,
  ensureType,
  uncheckedCast,
  withoutNils,
} from "@/wab/shared/common";
import { DomainValidator } from "@/wab/shared/hosting";
import { Request, Response } from "express-serve-static-core";
import { omit, uniq } from "lodash";

import { getTeamDiscourseInfo as doGetTeamDiscourseInfo } from "@/wab/server/discourse/getTeamDiscourseInfo";
import { sendTeamSupportWelcomeEmail as doSendTeamSupportWelcomeEmail } from "@/wab/server/discourse/sendTeamSupportWelcomeEmail";
import { syncTeamDiscourseInfo as doSyncTeamDiscourseInfo } from "@/wab/server/discourse/syncTeamDiscourseInfo";
import { checkAndResetTeamTrial } from "@/wab/server/routes/team-plans";
import { mkApiWorkspace } from "@/wab/server/routes/workspaces";
import { broadcastProjectsMessage } from "@/wab/server/socket-util";

export async function createUser(req: Request, res: Response) {
  throw new Error("NOT IMPLEMENTED");
  // const mgr = superDbMgr(req);
  // const user = await mgr.createUser(req.body);
  // res.json({ user });
}

export async function listUsers(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const users = await mgr.listAllUsers();
  res.json(ensureType<ListUsersResponse>({ users }));
}

export async function listAllFeatureTiers(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const tiers = await mgr.listAllFeatureTiers();
  res.json(ensureType<ListFeatureTiersResponse>({ tiers }));
}

export async function addFeatureTier(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const data = uncheckedCast<ApiFeatureTier>(req.body.data);
  await mgr.addFeatureTier(data);
  res.json({});
}

export async function changeTeamOwner(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const teamId = req.body.teamId;
  const newOwner = req.body.newOwner;

  await (teamId && newOwner && mgr.changeTeamOwner(teamId, newOwner));
  res.json({});
}

export async function upgradePersonalTeam(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const teamId = req.body.teamId;

  await (teamId && mgr.upgradePersonalTeam(teamId));
  res.json({});
}

export async function resetTeamTrial(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const teamId = req.body.teamId;
  await checkAndResetTeamTrial(teamId, mgr, req.devflags);
  res.json({});
}

export async function listTeams(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const userId = req.body.userId as UserId;
  const featureTierIds = req.body.featureTierIds as FeatureTierId[];
  if (!userId && !featureTierIds) {
    throw new BadRequestError("must filter by userId or featureTierIds");
  } else if (userId && featureTierIds) {
    throw new BadRequestError(
      "cannot filter by both userId and featureTierIds"
    );
  }

  const teams = await (userId
    ? mgr.listTeamsForUser(userId)
    : mgr.listTeamsByFeatureTiers(featureTierIds));
  res.json({ teams });
}

export async function listProjects(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const ownerId = req.body.ownerId;
  const projects = await (ownerId
    ? mgr.listProjectsForUser(ownerId)
    : mgr.listAllProjects());
  res.json({ projects: projects.map(mkApiProject) });
}

export async function createWorkspace(req: Request, res: Response) {
  const mgr = superDbMgr(req);

  const { id, name, description, teamId } = req.body;
  const workspace = await mgr.createWorkspaceWithId({
    id,
    name,
    description,
    teamId,
  });

  res.json({ workspace: mkApiWorkspace(workspace) });
}

export async function deleteProjectAndRevisions(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const { projectId } = req.body;

  if (await mgr.tryGetProjectById(projectId, true)) {
    const pkg = await mgr.getPkgByProjectId(projectId);
    if (pkg) {
      await mgr.getEntMgr().getRepository(PkgVersion).delete({
        pkgId: pkg.id,
      });
    }
    await mgr.getEntMgr().getRepository(ProjectRevision).delete({
      projectId,
    });
  }
  res.json({});
}

export async function deleteProject(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  await doSafelyDeleteProject(
    mgr,
    new DomainValidator(req.devflags.plasmicHostingSubdomainSuffix),
    req.body.id
  );
  res.json({});
}

export async function updateProjectOwner(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const project = await mgr.getProjectById(req.body.projectId);
  const user = await mgr.getUserByEmail(req.body.ownerEmail);

  await mgr.updateProjectOwner(project.id, user.id);
  res.json({});
}

export async function restoreProject(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const users = await mgr.restoreProject(req.body.id);
  res.json({});
}

export async function resetPassword(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const email = req.body.email;
  const user = await mgr.tryGetUserByEmail(email);
  if (user) {
    const resetSecret = await mgr.createResetPasswordForUser(user);
    res.json({ secret: resetSecret });
  } else {
    throw new NotFoundError("No user found.");
  }
}

export async function setPassword(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const email = req.body.email;
  const newPassword = req.body.newPassword;
  const user = await mgr.tryGetUserByEmail(email);
  if (user) {
    await mgr.updateUserPassword(user, newPassword, true);
    res.json({});
  } else {
    throw new NotFoundError("No user found.");
  }
}

export async function adminLoginAs(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const email = req.body.email;
  const user = ensure(
    await mgr.tryGetUserByEmail(email),
    () => `User not found`
  );
  await new Promise<void>((resolve, reject) => {
    doLogin(req, user, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  console.log("admin logged in as", getUser(req).email);
  res.cookie("plasmic-observer", "true");
  res.json(ensureType<LoginResponse>({ status: true, user }));
}

export async function getDevFlagOverrides(req: Request, res: Response) {
  const data = (await superDbMgr(req).tryGetDevFlagOverrides())?.data ?? "";
  res.json({ data });
}

export async function setDevFlagOverrides(req: Request, res: Response) {
  // Use userDbMgr so that data is stamped with the user's id
  await userDbMgr(req).setDevFlagOverrides(req.body.data);
  res.json({});
}

export async function getDevFlagVersions(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const versions = await mgr.getDevFlagVersions();
  res.json({ versions });
}

export async function cloneProject(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const projectId = req.body.projectId;
  const project = await mgr.cloneProject(projectId, req.bundler, {
    ownerId: ensure(req.user, () => "User not found").id,
    revisionNum: req.body.revisionNum,
  });

  // By default, turn off invite only for projects cloned this way
  await mgr.updateProject({ id: project.id, inviteOnly: true });
  res.json({ projectId: project.id });
}

export async function revertProjectRevision(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const projectId = req.body.projectId;
  const rev = req.body.revision;
  await mgr.revertProjectRev(projectId, rev);
  res.json({ projectId });
}

export async function getLatestProjectRevision(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const projectId = req.params.projectId as ProjectId;
  const rev = await mgr.getLatestProjectRev(projectId);
  res.json({ rev });
}

export async function saveProjectRevisionData(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const projectId = req.params.projectId as ProjectId;
  const rev = await mgr.getLatestProjectRev(projectId);
  if (rev.revision !== req.body.revision) {
    throw new BadRequestError(
      `Revision has since been updated from ${req.body.revision} to ${rev.revision}`
    );
  }

  // Make sure it's valid JSON
  JSON.parse(req.body.data);

  const newRev = await mgr.saveProjectRev({
    projectId: projectId,
    data: req.body.data,
    revisionNum: rev.revision + 1,
  });
  await mgr.clearPartialRevisionsCacheForProject(projectId, undefined);
  res.json({ rev: omit(newRev, "data") });
  await req.resolveTransaction();
  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "update",
    message: { projectId, revisionNum: newRev.revision },
  });
}

export async function getPkgVersion(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  let pkgVersion: PkgVersion;
  if (req.query.pkgVersionId) {
    pkgVersion = await mgr.getPkgVersionById(
      req.query.pkgVersionId as PkgVersionId
    );
  } else if (req.query.pkgId) {
    pkgVersion = await mgr.getPkgVersion(
      req.query.pkgId as string,
      req.query.version as string | undefined
    );
  } else {
    throw new BadRequestError("Must specify either PkgVersion ID or Pkg ID");
  }
  res.json({
    pkgVersion,
  });
}

export async function savePkgVersion(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const pkgVersionId = req.params.pkgVersionId;
  const data = req.body.data as string;
  const pkgVersion = await mgr.getPkgVersionById(pkgVersionId);
  await mgr.updatePkgVersion(pkgVersion.pkgId, pkgVersion.version, null, {
    model: data,
  });
  res.json({
    pkgVersion,
  });
}

export async function deactivateUser(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const email = req.body.email;
  const user = await mgr.tryGetUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }
  await mgr.deleteUser(user, false);
  res.json({});
}

export async function upgradeTeam(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const {
    teamId,
    featureTierId,
    seats,
    billingFrequency,
    billingEmail,
    stripeCustomerId,
    stripeSubscriptionId,
  } = req.body;
  await mgr.sudoUpdateTeam({
    id: teamId,
    featureTierId,
    seats,
    billingFrequency,
    billingEmail,
    stripeCustomerId,
    stripeSubscriptionId,
  });
  res.json({});
}

export async function upsertSsoConfig(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const { teamId, domain, provider, config, whitelabelConfig } = req.body;
  const sso = await mgr.upsertSsoConfig({
    teamId,
    domains: [domain],
    ssoType: "oidc",
    config,
    whitelabelConfig,
    provider,
  });
  res.json(sso);
}

export async function getSsoByTeam(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const teamId = req.query.teamId as TeamId;
  const sso = await mgr.getSsoConfigByTeam(teamId);
  res.json(sso ?? null);
}

export async function createTutorialDb(req: Request, res: Response) {
  console.log("Creating tutorialDB of type", req.body.type);
  const mgr = superDbMgr(req);
  const type = req.body.type as TutorialType;
  const result = await mgr.createTutorialDb(type);
  res.json({ id: result.id, ...result.info });
}

export async function resetTutorialDb(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const sourceId = req.body.sourceId as DataSourceId;
  const source = await mgr.getDataSourceById(sourceId);
  assert(source.source === "tutorialdb", "Can only reset tutorialdb");
  const tutorialDbId = source.credentials.tutorialDbId as TutorialDbId;
  const tutorialDb = await mgr.getTutorialDb(tutorialDbId);
  await doResetTutorialDb(tutorialDb.info);
  res.json({});
}

export async function getTeamByWhiteLabelName(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const team = await mgr.getTeamByWhiteLabelName(req.query.name as string);
  console.log("TEAM", req.query.name, team);
  res.json({ team: team });
}

export async function updateTeamWhiteLabelInfo(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const team = await mgr.getTeamById(req.body.id as TeamId);
  const team2 = await mgr.updateTeamWhiteLabelInfo(
    team.id,
    req.body.whiteLabelInfo
  );
  res.json({ team: team2 });
}

export async function updateTeamWhiteLabelName(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const team = await mgr.updateTeamWhiteLabelName(
    req.body.id as TeamId,
    req.body.whiteLabelName
  );
  res.json({ team: team });
}

export async function updateSelfAdminMode(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const disabled = uncheckedCast<UpdateSelfAdminModeRequest>(
    req.body
  ).adminModeDisabled;
  await mgr.updateAdminMode({
    id: getUser(req).id,
    disabled,
  });
  res.json({});
}

export async function createPromotionCode(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const { id, message, expirationDate, trialDays } = req.body as PromotionCode;
  await mgr.createPromotionCode(id, message, trialDays, expirationDate);
  res.json({});
}

export async function getAppAuthMetrics(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const { recency, threshold } = req.query;
  const metrics = await mgr.getAppAuthMetrics(
    recency ? parseInt(recency as string) : undefined,
    threshold ? parseInt(threshold as string) : undefined
  );
  res.json({ metrics });
}

// Describe app auth and used data sources in a project
export async function getProjectAppMeta(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const { projectId } = req.params;

  const rev = await mgr.getLatestProjectRev(projectId as string);
  const appAuthConfig = await mgr.getAppAuthConfig(projectId as string);
  const roles = await mgr.listAppRoles(projectId as string);
  const accesses = await mgr.listAppAccessRules(projectId as string);

  const bundle = JSON.parse(rev.data) as Bundle;

  const sourceIds: string[] = [];
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "DataSourceOpExpr") {
      sourceIds.push(inst.sourceId);
    }
  }

  const dataSources = await Promise.all(
    uniq(sourceIds).map((id) => mgr.getDataSourceById(id))
  );

  const meta = {
    projectId,
    appAuthConfig: appAuthConfig
      ? mkApiAppAuthConfig(appAuthConfig)
      : undefined,
    roles: roles.map(mkApiAppRole),
    accesses: accesses.map(mkApiAppEndUserAccess),
    dataSources: dataSources.map((ds) => mkApiDataSource(ds, ds.createdById!)),
  };

  res.json(meta);
}

export async function getTeamDiscourseInfo(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const teamId = req.params.teamId as TeamId;
  const info: ApiTeamDiscourseInfo | undefined = await doGetTeamDiscourseInfo(
    mgr,
    teamId
  );
  if (info) {
    res.json(info);
  } else {
    throw new NotFoundError();
  }
}

export async function syncTeamDiscourseInfo(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const teamId = req.params.teamId as TeamId;
  const slug = req.body.slug;
  const name = req.body.name;
  res.json(
    uncheckedCast<ApiTeamDiscourseInfo>(
      await doSyncTeamDiscourseInfo(mgr, teamId, slug, name)
    )
  );
}

export async function sendTeamSupportWelcomeEmail(req: Request, res: Response) {
  const teamId = req.params.teamId as TeamId;
  res.json(
    uncheckedCast<SendEmailsResponse>(
      await doSendTeamSupportWelcomeEmail(req, teamId)
    )
  );
}

export async function getProjectBranchesMetadata(req: Request, res: Response) {
  const projectId = req.params.projectId as ProjectId;
  const mgr = superDbMgr(req);
  const branches = await mgr.listBranchesForProject(projectId, true);
  const pkg = ensure(
    await mgr.getPkgByProjectId(projectId),
    `No pkg for project ${projectId}`
  );
  const pkgVersions = await mgr.listPkgVersions(pkg.id, {
    includeData: false,
    unfiltered: true,
  });
  const project = await mgr.getProjectById(projectId);
  const commitGraph = await mgr.getCommitGraphForProject(projectId);
  const usersIds = withoutNils(uniq(pkgVersions.map((v) => v.createdById)));
  const users = await mgr.getUsersById(usersIds);

  res.json({
    branches,
    pkgVersions,
    project,
    commitGraph,
    users,
  });
}
