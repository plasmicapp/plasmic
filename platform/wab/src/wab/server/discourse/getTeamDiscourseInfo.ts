import { DbMgr } from "@/wab/server/db/DbMgr";
import { TeamDiscourseInfo } from "@/wab/server/entities/Entities";
import { TeamId } from "@/wab/shared/ApiSchema";

export async function getTeamDiscourseInfo(
  mgr: DbMgr,
  teamId: TeamId
): Promise<TeamDiscourseInfo | undefined> {
  return mgr.getDiscourseInfoByTeamId(teamId);
}
