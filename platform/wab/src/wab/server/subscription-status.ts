import type { DbMgr } from "@/wab/server/db/DbMgr";
import { SubscriptionStatusRecord, Team } from "@/wab/server/entities/Entities";
import { TeamId, TeamSubscriptionStatus } from "@/wab/shared/ApiSchema";
import { getPastDuePhase } from "@/wab/shared/billing/billing-util";
import { chunk, uniq } from "lodash";
import type Stripe from "stripe";
import { Temporal } from "temporal-polyfill";
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
      ? {
          status: record.status,
          pastDuePhaseOverride: record.pastDuePhaseOverride,
          pastDueLastDay: getPastDueLastDay(record)?.toString() ?? null,
        }
      : { status: deriveSubscriptionStatus(team, null), pastDueLastDay: null };
  });
}

export function isPaidSubscriptionStatus(
  status: TeamSubscriptionStatus,
): boolean {
  // Past-due subscriptions retain paid access while payment is retried.
  return status === "paid" || status === "manual" || status === "past_due";
}

export async function isPaidTeam(team: Team, mgr: DbMgr): Promise<boolean> {
  const [{ status }] = await loadSubscriptionStatuses(mgr, [team]);
  return isPaidSubscriptionStatus(status);
}

/** Like isPaidTeam, but a past-due team loses paid access once editing is blocked. */
export async function isPaidTeamNotBlocked(
  team: Team,
  mgr: DbMgr,
): Promise<boolean> {
  const [{ status, pastDueLastDay, pastDuePhaseOverride }] =
    await loadSubscriptionStatuses(mgr, [team]);
  return (
    isPaidSubscriptionStatus(status) &&
    getPastDuePhase({
      subscriptionStatus: status,
      pastDueLastDay,
      pastDuePhaseOverride,
    }) !== "blocked"
  );
}

const PAST_DUE_GRACE_DAYS = 7;
export const PAST_DUE_WARNING_HOURS = 48;
// Teams already past due at launch get a full grace period from this date.
export const PAST_DUE_POLICY_START = Temporal.PlainDate.from("2026-11-20");

/** Last calendar day of editing, inclusive in every timezone. */
export function getPastDueLastDay(
  record: Pick<SubscriptionStatusRecord, "status" | "createdAt">,
): Temporal.PlainDate | null {
  if (record.status !== "past_due") {
    return null;
  }
  const started = Temporal.Instant.from(record.createdAt.toISOString())
    .toZonedDateTimeISO("UTC")
    .toPlainDate();
  const since =
    Temporal.PlainDate.compare(started, PAST_DUE_POLICY_START) < 0
      ? PAST_DUE_POLICY_START
      : started;
  return since.add({ days: PAST_DUE_GRACE_DAYS });
}

export async function getTeamSubscription(mgr: DbMgr, team: Team) {
  const [{ status, pastDueLastDay, pastDuePhaseOverride }] =
    await loadSubscriptionStatuses(mgr, [team]);
  return {
    subscriptionStatus: status,
    pastDueLastDay,
    pastDuePhaseOverride: pastDuePhaseOverride ?? null,
    billingTeamId: getEntitledTeam(team).id,
  };
}
