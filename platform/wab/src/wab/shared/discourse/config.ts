import { AccessLevel } from "@/wab/shared/EntUtil";

export const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://forum.plasmic.app"
    : "https://forum.test.plasmic.app";

export const SYSTEM_USERNAME = "system";
export const PUBLIC_SUPPORT_CATEGORY_ID = 5;
export const PRIVATE_SUPPORT_CATEGORY_ID = 14;
export const SUPPORT_GROUP_NAME = "support";
export const MIN_ACCESS_LEVEL_FOR_SUPPORT: AccessLevel = "content";

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
  // Growth === legacy plan similar to Pro plan
  Growth: {
    categoryBackgroundColor: "12A89D",
  },
};
