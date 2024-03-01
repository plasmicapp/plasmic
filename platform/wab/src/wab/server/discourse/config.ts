export const BASE_URL = "https://forum.plasmic.app";
export const SYSTEM_USERNAME = "system";
export const PUBLIC_SUPPORT_CATEGORY_ID = 5;
export const PRIVATE_SUPPORT_CATEGORY_ID = 14;
export const SUPPORT_GROUP_NAME = "support";

export interface FeatureTierConfig {
  categoryBackgroundColor: string;
}
export const FEATURE_TIERS: { [featureTier: string]: FeatureTierConfig } = {
  Enterprise: {
    categoryBackgroundColor: "F1592A",
  },
  // Team == Scale
  Team: {
    categoryBackgroundColor: "9EB83B",
  },
  Pro: {
    categoryBackgroundColor: "12A89D",
  },
};
