import { userDbMgr } from "@/wab/server/routes/util";
import { getTeamSubscription } from "@/wab/server/subscription-status";
import { ProjectId, TeamId } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { subscriptionStatusContract } from "@/wab/shared/api/subscription-status";
import { initServer } from "@ts-rest/express";
import { Request } from "express";

const s = initServer();
export const subscriptionStatusServer = s.router(subscriptionStatusContract, {
  team: async ({ req }) => ({
    status: 200,
    body: await getSubscriptionStatus(req),
  }),
  project: async ({ req }) => ({
    status: 200,
    body: await getProjectSubscriptionStatus(req),
  }),
});

/** Billing details are separate from public team and project responses. */
export async function getSubscriptionStatus(req: Request) {
  const mgr = userDbMgr(req);
  const team = await mgr.getTeamById(req.params.teamId as TeamId);
  return getTeamSubscription(mgr, team);
}

export async function getProjectSubscriptionStatus(req: Request) {
  const mgr = userDbMgr(req);
  const projectId = req.params.projectId as ProjectId;
  const project = await mgr.getProjectById(projectId);
  // Viewers can open Studio, but don't need its billing details.
  const canEdit =
    accessLevelRank(await mgr.getActorAccessLevelToProject(projectId)) >=
    accessLevelRank("content");
  const team = project.workspace?.team;
  return team && canEdit ? getTeamSubscription(mgr, team) : null;
}
