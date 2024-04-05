import { AccessLevel } from "@/wab/shared/EntUtil";

export const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://forum.plasmic.app"
    : "https://forum.test.plasmic.app";

// https://forum.plasmic.app/u/system/summary
export const SYSTEM_USERNAME = "system";

// https://forum.plasmic.app/c/plasmic-studio-questions/5
export const PUBLIC_SUPPORT_CATEGORY_ID = 5;

// https://forum.plasmic.app/c/support/14
export const PRIVATE_SUPPORT_CATEGORY_ID = 14;

// https://forum.plasmic.app/g/support
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
