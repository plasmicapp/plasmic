import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { FeatureTier } from "@/wab/server/entities/Entities";
import { EntityManager } from "typeorm";

/**
 * These feature tiers have Stripe IDs that map to our Stripe testmode account.
 * See docs/contributing/platform/02-integrations.md
 *
 * Though the data looks similar, it is NOT guaranteed to match production data.
 */
export async function seedTestFeatureTiers(em: EntityManager) {
  const db0 = new DbMgr(em, SUPER_USER);
  return {
    // current
    enterpriseFt: await db0.addFeatureTier(enterpriseFt),
    teamFt: await db0.addFeatureTier(teamFt),
    proFt: await db0.addFeatureTier(proFt),
    starterFt: await db0.addFeatureTier(starterFt),

    // legacy
    growthFt: await db0.addFeatureTier(growthFt),
    basicFt: await db0.addFeatureTier(basicFt),
  };
}

/** Enterprise feature tier. Customizable for each customer. */
const enterpriseFt: FeatureTier = {
  name: "Enterprise",
  monthlyBasePrice: null,
  monthlyBaseStripePriceId: null,
  annualBasePrice: null,
  annualBaseStripePriceId: null,
  monthlySeatPrice: 80,
  monthlySeatStripePriceId: "price_1Ji3EFHIopbCiFeiUCtiVOyB",
  annualSeatPrice: 768,
  annualSeatStripePriceId: "price_1Ji3EFHIopbCiFeiSj0U8o1K",
  minUsers: 30,
  maxUsers: 1_000,
  monthlyViews: 1_000_000,
  versionHistoryDays: 180,
  analytics: true,
  contentRole: true,
  designerRole: true,
  editContentCreatorMode: true,
  localization: true,
  splitContent: true,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

/**
 *  Current feature tier. Min seats included in base price.
 *  Externally, this is advertised as the "Scale" plan.
 */
const teamFt: FeatureTier = {
  name: "Team",
  monthlyBasePrice: 499,
  monthlyBaseStripePriceId: "price_1N9VlSHIopbCiFeiTU6RyL48",
  annualBasePrice: 4_788,
  annualBaseStripePriceId: "price_1N9VlSHIopbCiFeibn88Ezt0",
  monthlySeatPrice: 40,
  monthlySeatStripePriceId: "price_1N9VlxHIopbCiFeiLf3ngIwB",
  annualSeatPrice: 384,
  annualSeatStripePriceId: "price_1N9VlxHIopbCiFeicxycQNAp",
  minUsers: 8,
  maxUsers: 30,
  monthlyViews: 500_000,
  versionHistoryDays: 180,
  analytics: true,
  contentRole: true,
  designerRole: true,
  editContentCreatorMode: false,
  localization: true,
  splitContent: true,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

const proFt: FeatureTier = {
  name: "Pro",
  monthlyBasePrice: 129,
  monthlyBaseStripePriceId: "price_1N9VkLHIopbCiFeiSChtf6dV",
  annualBasePrice: 1_236,
  annualBaseStripePriceId: "price_1N9VkLHIopbCiFeiFsiEryvl",
  monthlySeatPrice: 20,
  monthlySeatStripePriceId: "price_1N9VkpHIopbCiFeiNptqZ2BR",
  annualSeatPrice: 192,
  annualSeatStripePriceId: "price_1N9VkpHIopbCiFeiMi50AFEk",
  minUsers: 4,
  maxUsers: 10,
  monthlyViews: 250_000,
  versionHistoryDays: 90,
  analytics: false,
  contentRole: false,
  designerRole: false,
  editContentCreatorMode: false,
  localization: false,
  splitContent: false,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

/** Current feature tier. Min seats included in base price. */
const starterFt = {
  name: "Starter",
  monthlyBasePrice: 49,
  monthlyBaseStripePriceId: "price_1N9VirHIopbCiFeicbMYaVhb",
  annualBasePrice: 468,
  annualBaseStripePriceId: "price_1N9VirHIopbCiFeiPRRXpINo",
  monthlySeatPrice: 0,
  monthlySeatStripePriceId: "price_1N9VjhHIopbCiFeic0V8lDJX",
  annualSeatPrice: 0,
  annualSeatStripePriceId: "price_1N9VjhHIopbCiFeiViCs7zEH",
  minUsers: 3,
  maxUsers: 3,
  monthlyViews: 100_000,
  versionHistoryDays: 30,
  analytics: false,
  contentRole: false,
  designerRole: false,
  editContentCreatorMode: false,
  localization: false,
  splitContent: false,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

/** Legacy feature tier. Min seats not included in base price. */
const growthFt = {
  name: "Growth",
  monthlyBasePrice: 160,
  monthlyBaseStripePriceId: "price_1LD8DGHIopbCiFeia2IQPtct",
  annualBasePrice: 1536,
  annualBaseStripePriceId: "price_1LD8DnHIopbCiFeiRLUVgwod",
  monthlySeatPrice: 40,
  monthlySeatStripePriceId: "price_1JLFu9HIopbCiFeiSZxQrGiI",
  annualSeatPrice: 384,
  annualSeatStripePriceId: "price_1JLFuIHIopbCiFeiRc7HOmiM",
  minUsers: 8,
  maxUsers: 30,
  monthlyViews: 500_000,
  versionHistoryDays: 90,
  analytics: true,
  contentRole: true,
  designerRole: true,
  editContentCreatorMode: true,
  localization: true,
  splitContent: true,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

/** Legacy feature tier. Min seats not included in base price. */
const basicFt = {
  name: "Basic",
  monthlyBasePrice: 20,
  monthlyBaseStripePriceId: "price_1L997gHIopbCiFeiIVUq4mOa",
  annualBasePrice: 192,
  annualBaseStripePriceId: "price_1L997gHIopbCiFeiUvUga8vw",
  monthlySeatPrice: 20,
  monthlySeatStripePriceId: "price_1L995cHIopbCiFeiGy8STswq",
  annualSeatPrice: 192,
  annualSeatStripePriceId: "price_1L996PHIopbCiFeiaAWzCX2L",
  minUsers: 4,
  maxUsers: 10,
  monthlyViews: 100_000,
  versionHistoryDays: 30,
  analytics: false,
  contentRole: false,
  designerRole: false,
  editContentCreatorMode: false,
  localization: false,
  splitContent: false,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

/** Legacy seats-only feature tier. No min users, no base price. */
const basicSeatsOnly = {
  name: "Basic",
  monthlyBasePrice: null,
  monthlyBaseStripePriceId: null,
  annualBasePrice: null,
  annualBaseStripePriceId: null,
  monthlySeatPrice: 15,
  monthlySeatStripePriceId: "price_1JKnrcHIopbCiFeifoHWd1h2",
  annualSeatPrice: 144,
  annualSeatStripePriceId: "price_1JLFtRHIopbCiFeiWxfflHKB",
  minUsers: 0,
  maxUsers: 10,
  monthlyViews: 100_000,
  versionHistoryDays: 30,
  analytics: false,
  contentRole: false,
  designerRole: false,
  editContentCreatorMode: false,
  localization: false,
  splitContent: false,
  privateUsersIncluded: null,
  maxPrivateUsers: null,
  publicUsersIncluded: null,
  maxPublicUsers: null,
  maxWorkspaces: null,
} as FeatureTier;

export const _testonly = {
  enterpriseFt,
  teamFt,
  proFt,
  starterFt,
  growthFt,
  basicFt,
  basicSeatsOnly,
};
