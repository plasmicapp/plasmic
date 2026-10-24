import type { DbMgr } from "@/wab/server/db/DbMgr";
import { SubscriptionStatusRecord } from "@/wab/server/entities/CustomEntities";
import { Team } from "@/wab/server/entities/Entities";
import { TeamId, TeamSubscriptionStatus } from "@/wab/shared/ApiSchema";
import { chunk, uniq } from "lodash";
import type Stripe from "stripe";
import type { EntityManager } from "typeorm";

// A child organization inherits its parent's plan (see mkApiTeam).
export function getEntitledTeam(team: Team): Team {
  return team.featureTierId || !team.parentTeam ? team : team.parentTeam;
}

// A null sub means Stripe was not read, so the tier is trusted.
export function deriveSubscriptionStatus(
  team: Pick<Team, "featureTierId" | "stripeSubscriptionId" | "trialStartDate">,
  sub: Pick<Stripe.Subscription, "status" | "default_payment_method"> | null,
): TeamSubscriptionStatus {
  if (!team.featureTierId) {
    return "free";
  }
  if (!team.stripeSubscriptionId) {
    return team.trialStartDate ? "trial" : "manual";
  }
  switch (sub?.status) {
    case undefined:
    case "active":
      return "paid";
    // A Stripe trial is a paid plan whose first charge is deferred, not a free trial.
    case "trialing":
      return sub.default_payment_method ? "paid" : "free";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "free";
  }
}

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
