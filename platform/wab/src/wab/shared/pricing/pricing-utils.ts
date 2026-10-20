import { ApiFeatureTier, ApiTeam } from "@/wab/shared/ApiSchema";
import { ensure, withoutFalsy } from "@/wab/shared/common";
import { capitalizeFirst } from "@/wab/shared/strs";
import { maxBy } from "lodash";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
export const featureTiers = ["Basic", "Growth", "Enterprise"] as const;
const featureTierTypes = ["basic", "growth", "enterprise"] as const;
export const newFeatureTiers = [
  "Starter",
  "Pro",
  "Team",
  "Enterprise",
] as const;
const newFeatureTierTypes = ["starter", "pro", "team", "enterprise"] as const;

export const tiers = ["free", ...featureTierTypes, "legacy"] as const;
export const newTiers = ["free", ...newFeatureTierTypes, "legacy"] as const;
export type PriceTierType = (typeof tiers)[number];
export type NewPriceTierType = (typeof newTiers)[number];

export const isEnterprise = (tier?: ApiFeatureTier | null) =>
  !!tier?.name.toLowerCase().includes("enterprise");

export const isUpgradableTier = (tier?: ApiFeatureTier | null) =>
  !(tier && ["growth", "team", "enterprise"].includes(tier.name.toLowerCase()));

/**
 * Given a ApiFeatureTier name, try to figure out which `type` to use
 * @param name
 * @returns
 */
export const getPriceTierType = (name?: string): PriceTierType => {
  const lowerName = !!name ? name.toLowerCase() : "";
  if (["", "free", "starter"].includes(lowerName)) {
    return "free";
  } else if (["basic"].includes(lowerName)) {
    return "basic";
  } else if (["growth"].includes(lowerName)) {
    return "growth";
  } else if (["enterprise"].includes(lowerName)) {
    return "enterprise";
  } else {
    return "legacy";
  }
};

/**
 * Given a ApiFeatureTier name, try to figure out which `type` to use
 * @param name
 * @returns
 */
export const getNewPriceTierType = (name?: string): NewPriceTierType => {
  const lowerName = !!name ? name.toLowerCase() : "";
  if (["", "free"].includes(lowerName)) {
    return "free";
  } else if (["starter"].includes(lowerName)) {
    return "starter";
  } else if (["pro"].includes(lowerName)) {
    return "pro";
  } else if (["team"].includes(lowerName)) {
    return "team";
  } else if (["enterprise"].includes(lowerName)) {
    return "enterprise";
  } else {
    return "legacy";
  }
};

/**
 * Given a ApiFeatureTier name, return the external name used for the users
 * @param name
 * @returns
 */
export const getExternalPriceTier = (tier: NewPriceTierType): string => {
  const getTierString = () => {
    if (tier === "team") {
      return "scale";
    }
    return tier;
  };

  return capitalizeFirst(getTierString());
};

export const getExternalPriceTierName = (name?: string): string =>
  getExternalPriceTier(getNewPriceTierType(name));

/**
 * Given a list of feature tier names, return tier with the maximum level,
 * sanitized. For example, getMaximumTier(["Free", "Enterprise"]) =u
 * "enterprise".
 */
export function getMaximumTier(names: string[]): NewPriceTierType {
  return getNewPriceTierType(maxBy(names, getTierRank));
}

export function getTierRank(name?: string): number {
  return newTiers.indexOf(getNewPriceTierType(name));
}

export function getMaximumTierFromTeams(teams: ApiTeam[]) {
  const names = withoutFalsy(teams.map((t) => t.featureTier?.name));
  return getMaximumTier(names);
}

export type OrgStatus =
  | { status: "trial"; trialDaysLeft: number }
  | { status: "trialEnded" }
  | { status: "paid" }
  | { status: "free" };

export function getOrgStatus(
  team: ApiTeam,
  defaultTrialDays: number,
): OrgStatus {
  if (team.onTrial) {
    return {
      status: "trial",
      trialDaysLeft: getTrialDaysLeft(team, defaultTrialDays),
    };
  }
  if (recentlyEndedTrial(team, defaultTrialDays)) {
    return { status: "trialEnded" };
  }
  return getNewPriceTierType(team.featureTier?.name) === "free"
    ? { status: "free" }
    : { status: "paid" };
}

function getTrialDaysLeft(team: ApiTeam, defaultTrialDays: number): number {
  return Math.max(
    0,
    Math.round(
      (trialLengthMs(team, defaultTrialDays) - trialElapsedMs(team)) /
        MILLIS_PER_DAY,
    ),
  );
}

export function isTrialActive(
  team: ApiTeam,
  defaultTrialDays: number,
): boolean {
  return trialElapsedMs(team) <= trialLengthMs(team, defaultTrialDays);
}

function recentlyEndedTrial(team: ApiTeam, defaultTrialDays: number): boolean {
  const daysToShowAfterEnded = 7;
  return !!(
    !team.featureTierId &&
    team.trialStartDate &&
    trialLengthMs(team, defaultTrialDays) +
      daysToShowAfterEnded * MILLIS_PER_DAY >
      trialElapsedMs(team)
  );
}

function trialLengthMs(team: ApiTeam, defaultTrialDays: number) {
  return (team.trialDays ?? defaultTrialDays) * MILLIS_PER_DAY;
}

function trialElapsedMs(team: ApiTeam) {
  const start = ensure(team.trialStartDate, "trial has a start date");
  return Date.now() - new Date(start).getTime();
}
