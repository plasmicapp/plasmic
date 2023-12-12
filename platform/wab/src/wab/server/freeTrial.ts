import { Team } from "./entities/Entities";

export function isTeamOnFreeTrial(team: Team): boolean {
  return !!(
    team.featureTier &&
    !team.stripeSubscriptionId &&
    team.trialStartDate
  );
}
