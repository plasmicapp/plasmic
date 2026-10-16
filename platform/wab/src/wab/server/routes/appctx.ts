import { checkFreeTrialDuration } from "@/wab/server/routes/team-plans";
import { mkApiTeams } from "@/wab/server/routes/teams";
import { userDbMgr } from "@/wab/server/routes/util";
import { mkApiWorkspaces } from "@/wab/server/routes/workspaces";
import { AppCtxResponse } from "@/wab/shared/ApiSchema";
import { ensureType } from "@/wab/shared/common";
import { Request, Response } from "express-serve-static-core";

export async function getAppCtx(req: Request, res: Response) {
  const userMgr = userDbMgr(req, { allowUnverifiedEmail: true });

  if (!userMgr.tryGetNormalActorId() || req.user?.waitingEmailVerification) {
    // Return empty response if called by a non-normal user or user waiting
    // email verification.
    res.json(
      ensureType<AppCtxResponse>({ teams: [], workspaces: [], perms: [] }),
    );
    return;
  }

  const dbTeams = await userMgr.getAffiliatedTeams();
  // Sequential: checks share the request transaction and can lock the same parent.
  for (const team of dbTeams) {
    await checkFreeTrialDuration(req, team);
  }
  const teams = await mkApiTeams(userMgr, dbTeams);
  const workspaces = await mkApiWorkspaces(
    userMgr,
    await userMgr.getAffiliatedWorkspaces(),
  );
  const { perms } = await userMgr.getSelfPerms();
  res.json(ensureType<AppCtxResponse>({ teams, workspaces, perms }));
}
