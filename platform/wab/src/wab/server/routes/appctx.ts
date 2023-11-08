import { Request, Response } from "express-serve-static-core";
import { ensureType } from "../../common";
import { ApiTeam, ApiWorkspace, AppCtxResponse } from "../../shared/ApiSchema";
import { checkFreeTrialDuration } from "./team-plans";
import { mkApiTeam } from "./teams";
import { userDbMgr } from "./util";
import { mkApiWorkspace } from "./workspaces";

export async function getAppCtx(req: Request, res: Response) {
  const userMgr = userDbMgr(req, { allowUnverifiedEmail: true });

  if (!userMgr.tryGetNormalActorId() || req.user?.waitingEmailVerification) {
    // Return empty response if called by a non-normal user or user waiting
    // email verification.
    res.json(
      ensureType<AppCtxResponse>({ teams: [], workspaces: [], perms: [] })
    );
    return;
  }

  const teams: ApiTeam[] = await Promise.all(
    (
      await userMgr.getAffiliatedTeams()
    ).map(async (t) => {
      await checkFreeTrialDuration(req, t);
      return mkApiTeam(t);
    })
  );
  const workspaces: ApiWorkspace[] = (
    await userMgr.getAffiliatedWorkspaces()
  ).map(mkApiWorkspace);
  const { perms } = await userMgr.getSelfPerms();
  res.json(ensureType<AppCtxResponse>({ teams, workspaces, perms }));
}
