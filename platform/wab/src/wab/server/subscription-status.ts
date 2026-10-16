import type { DbMgr } from "@/wab/server/db/DbMgr";
import { SubscriptionStatusRecord } from "@/wab/server/entities/CustomEntities";
import { Team } from "@/wab/server/entities/Entities";
import {
  deriveSubscriptionStatus,
  getEntitledTeam,
} from "@/wab/server/freeTrial";
import { TeamId, TeamSubscriptionStatus } from "@/wab/shared/ApiSchema";
import { chunk, uniq } from "lodash";
import type { EntityManager } from "typeorm";

export async function getLatestSubscriptionStatuses(
  em: EntityManager,
  teamIds: TeamId[],
) {
  const statuses = new Map<TeamId, SubscriptionStatusRecord>();
  // Batch to avoid PostgreSQL's 65,535 bind-parameter limit.
  for (const batch of chunk(teamIds, 10_000)) {
    const rows = await em
      .getRepository(SubscriptionStatusRecord)
      .createQueryBuilder("status")
      .distinctOn(['status."teamId"'])
      .where('status."teamId" IN (:...teamIds)', { teamIds: batch })
      .orderBy('status."teamId"')
      .addOrderBy('status."updatedAt"', "DESC")
      .getMany();
    for (const row of rows) {
      statuses.set(row.teamId, row);
    }
  }
  return statuses;
}

/** Latest recorded status of each team's entitled team. */
export async function loadSubscriptionStatuses(mgr: DbMgr, teams: Team[]) {
  const entitled = teams.map(getEntitledTeam);
  // Only Stripe state needs the history; the team row determines the rest.
  const records = await getLatestSubscriptionStatuses(
    mgr.getEntMgr(),
    uniq(entitled.filter((t) => t.stripeSubscriptionId).map((t) => t.id)),
  );
  return entitled.map((team) => {
    const record = records.get(team.id);
    return team.stripeSubscriptionId &&
      record?.stripeSubscriptionId === team.stripeSubscriptionId
      ? record.status
      : deriveSubscriptionStatus(team, null);
  });
}

export function isPaidSubscriptionStatus(
  status: TeamSubscriptionStatus,
): boolean {
  // Past-due subscriptions retain paid access while payment is retried.
  return status === "paid" || status === "manual" || status === "past_due";
}

export async function isPaidTeam(team: Team, mgr: DbMgr): Promise<boolean> {
  const [status] = await loadSubscriptionStatuses(mgr, [team]);
  return isPaidSubscriptionStatus(status);
}
