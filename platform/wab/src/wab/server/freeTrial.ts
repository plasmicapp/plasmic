import { Team } from "./entities/Entities";

// It would be nice to not need to know to check for stripeSubscriptionId
// https://linear.app/plasmic/issue/PLA-10654
export function isTeamOnFreeTrial(team: Team): boolean {
  return !!(
    team.featureTier &&
    !team.stripeSubscriptionId &&
    team.trialStartDate
  );
}
