import { ensureType } from "@/wab/common";
import { checkFreeTrialDuration } from "@/wab/server/routes/team-plans";
import { mkApiTeam } from "@/wab/server/routes/teams";
import { userDbMgr } from "@/wab/server/routes/util";
import { mkApiWorkspace } from "@/wab/server/routes/workspaces";
import { ApiTeam, ApiWorkspace, AppCtxResponse } from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";

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
