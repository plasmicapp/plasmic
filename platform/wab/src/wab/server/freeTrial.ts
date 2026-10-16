import { Team } from "@/wab/server/entities/Entities";
import { TeamSubscriptionStatus } from "@/wab/shared/ApiSchema";
import type Stripe from "stripe";

export function isTeamOnFreeTrial(team: Team): boolean {
  return !!(
    team.featureTierId &&
    !team.stripeSubscriptionId &&
    team.trialStartDate
  );
}

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
