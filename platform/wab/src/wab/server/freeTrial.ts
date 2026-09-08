import { Team } from "@/wab/server/entities/Entities";
import { checkIsTeamOnFreeTierOrTrial } from "@/wab/shared/billing/billing-util";

// It would be nice to not need to know to check for stripeSubscriptionId
// https://linear.app/plasmic/issue/PLA-10654
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

// Stripe status is not synced, so a lapsed subscription counts as paid until
// checkStripeSubscription() clears the tier.
export function isPaidTeam(team: Team): boolean {
  const entitled = getEntitledTeam(team);
  return !checkIsTeamOnFreeTierOrTrial({
    featureTierId: entitled.featureTierId,
    onTrial: isTeamOnFreeTrial(entitled),
  });
}
