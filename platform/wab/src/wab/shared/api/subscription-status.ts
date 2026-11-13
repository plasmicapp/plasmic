import { ApiTeamSubscription, ProjectId, TeamId } from "@/wab/shared/ApiSchema";
import { cStandard4xxResponse } from "@/wab/shared/api/util";
import { zOpaqueString } from "@/wab/shared/utils/zod-utils";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();
const errors = {
  401: cStandard4xxResponse(),
  403: cStandard4xxResponse(),
  404: cStandard4xxResponse(),
};
export const subscriptionStatusContract = c.router({
  team: {
    method: "GET",
    path: "/api/v1/teams/:teamId/subscription-status",
    pathParams: z.object({ teamId: zOpaqueString<TeamId>() }),
    responses: { 200: c.type<ApiTeamSubscription>(), ...errors },
  },
  project: {
    method: "GET",
    path: "/api/v1/projects/:projectId/subscription-status",
    pathParams: z.object({ projectId: zOpaqueString<ProjectId>() }),
    responses: { 200: c.type<ApiTeamSubscription | null>(), ...errors },
  },
});
