import { withoutFalsy } from "@/wab/shared/common";
import { ApiFeatureTier, ApiTeam } from "@/wab/shared/ApiSchema";
import { capitalizeFirst } from "@/wab/shared/strs";
import { maxBy } from "lodash";

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

/**
 * Given a list of feature tier names, return tier with the maximum level,
 * sanitized. For example, getMaximumTier(["Free", "Enterprise"]) =u
 * "enterprise".
 */
export function getMaximumTier(names: string[]): NewPriceTierType {
  const types = names.map((name) => getNewPriceTierType(name));
  return maxBy(types, (type) => newTiers.indexOf(type)) ?? "free";
}

export function getMaximumTierFromTeams(teams: ApiTeam[]) {
  const names = withoutFalsy(teams.map((t) => t.featureTier?.name));
  return getMaximumTier(names);
}
