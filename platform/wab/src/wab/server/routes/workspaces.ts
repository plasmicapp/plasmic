import { Workspace } from "@/wab/server/entities/Entities";
import { doSafelyDeleteProject } from "@/wab/server/routes/projects";
import {
  maybeTriggerPaywall,
  passPaywall,
} from "@/wab/server/routes/team-plans";
import { mkApiTeam } from "@/wab/server/routes/teams";
import {
  commitTransaction,
  rollbackTransaction,
  startTransaction,
  userDbMgr,
} from "@/wab/server/routes/util";
import {
  ApiTeam,
  ApiWorkspace,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  GetWorkspaceResponse,
  MayTriggerPaywall,
  UpdateWorkspaceRequest,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { ensureType } from "@/wab/shared/common";
import { createTaggedResourceId } from "@/wab/shared/perms";
import { Request, Response } from "express-serve-static-core";
import L from "lodash";

export function mkApiWorkspace(workspace: Workspace): ApiWorkspace {
  return {
    ...L.pick(workspace, [
      "createdAt",
      "updatedAt",
      "deletedAt",
      "createdById",
      "updatedById",
      "deletedById",
      "id",
      "name",
      "description",
      "uiConfig",
    ]),
    team: mkApiTeam(workspace.team),
    // only use the custom config if team feature tier has permission to customize it
    contentCreatorConfig: workspace.team.featureTier?.editContentCreatorMode
      ? workspace.contentCreatorConfig
      : null,
  };
}

export async function getWorkspaces(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const workspaces: ApiWorkspace[] = (
    await userMgr.getAffiliatedWorkspaces()
  ).map(mkApiWorkspace);
  const teams: ApiTeam[] = (await userMgr.getAffiliatedTeams()).map(mkApiTeam);
  res.json({ teams, workspaces });
}

export async function getWorkspace(req: Request, res: Response) {
  const { workspaceId } = req.params as { workspaceId: WorkspaceId };
  const userMgr = userDbMgr(req);
  const workspace = await userMgr.getWorkspaceById(workspaceId);
  const apiWorkspace = mkApiWorkspace(workspace);
  const perms = await userMgr.getPermissionsForWorkspaces([workspaceId]);
  res.json(
    ensureType<GetWorkspaceResponse>({ workspace: apiWorkspace, perms })
  );
}

export async function getPersonalWorkspace(req: Request, res: Response) {
  const userMgr = userDbMgr(req);
  const workspace = await userMgr.getPersonalWorkspace();

  if (!workspace) {
    // Failed to find the user's personal workspace
    res.status(404).send();
  } else {
    const perms = await userMgr.getPermissionsForWorkspaces([workspace.id]);
    const apiWorkspace = mkApiWorkspace(workspace);

    res.json(
      ensureType<GetWorkspaceResponse>({
        workspace: apiWorkspace as any,
        perms,
      })
    );
  }
}

export async function createWorkspace(req: Request, res: Response) {
  const {
    name: rawName,
    description: rawDescription,
    teamId,
  }: CreateWorkspaceRequest = req.body;
  const name = rawName || "Untitled workspace";
  const description = rawDescription || "";

  const { commit, rollback } = await startTransaction(req, async () => {
    const userMgr = userDbMgr(req);
    const team = await userMgr.getTeamById(teamId);
    const workspace = await userMgr.createWorkspace({
      name,
      description,
      teamId,
    });
    const apiWorkspace = mkApiWorkspace(workspace);
    req.analytics.track("Create workspace", {
      workspaceName: name,
      workspaceDescription: description,
      teamId,
      featureTierId: team.featureTierId,
    });

    const paywall = await maybeTriggerPaywall(
      req,
      [createTaggedResourceId("team", teamId)],
      {},
      {
        workspace: apiWorkspace,
      }
    );
    if (paywall.paywall === "pass") {
      return commitTransaction(paywall);
    } else {
      return rollbackTransaction(paywall);
    }
  });

  const response: MayTriggerPaywall<CreateWorkspaceResponse> =
    rollback ?? commit;
  res.json(response);
}

export async function updateWorkspace(req: Request, res: Response) {
  const { commit, rollback } = await startTransaction(req, async () => {
    const userMgr = userDbMgr(req);
    const args = req.body as UpdateWorkspaceRequest;
    const workspace = await userMgr.updateWorkspace({
      workspaceId: req.params.workspaceId as WorkspaceId,
      ...args,
    });

    const apiWorkspace = mkApiWorkspace(workspace);
    const response: CreateWorkspaceResponse = { workspace: apiWorkspace };

    // Bypass paywall if workspace is not being moved to a different team.
    const paywall = args.teamId
      ? await maybeTriggerPaywall(
          req,
          [createTaggedResourceId("team", apiWorkspace.team.id)],
          {},
          response
        )
      : passPaywall(response);

    if (paywall.paywall === "pass") {
      return commitTransaction(paywall);
    } else {
      return rollbackTransaction(paywall);
    }
  });

  const response: MayTriggerPaywall<CreateWorkspaceResponse> =
    rollback ?? commit;
  res.json(response);
}

export async function deleteWorkspace(req: Request, res: Response) {
  const { workspaceId } = req.params as { workspaceId: WorkspaceId };
  const mgr = userDbMgr(req);

  for (const cms of await mgr.listCmsDatabases(workspaceId)) {
    await mgr.deleteCmsDatabase(cms.id);
  }

  for (const source of await mgr.getWorkspaceDataSources(workspaceId)) {
    await mgr.deleteDataSource(source.id);
  }

  for (const project of await mgr.getProjectsByWorkspaces([workspaceId])) {
    await doSafelyDeleteProject(mgr, project.id);
  }

  await mgr.deleteWorkspace(workspaceId);
  res.json({
    deletedId: workspaceId,
  });
}
