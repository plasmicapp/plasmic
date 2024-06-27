/**
 * Check for a valid Stripe subscription state.
 * - This is the only place where we query Stripe on whether the subscription is still valid (e.g. expired, cancelled, etc)
 * - If it's invalid, let's just treat the subscription as cancelled and upsell them again.
 */
import { DevFlagsType } from "@/wab/shared/devflags";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { Team } from "@/wab/server/entities/Entities";
import {
  ApiFeatureTier,
  MayTriggerPaywall,
  PaywallDescription,
  TeamId,
} from "@/wab/shared/ApiSchema";
import { SiteFeature, TaggedResourceId } from "@/wab/shared/perms";
import { Request } from "express-serve-static-core";
import moment from "moment/moment";
import Stripe from "stripe";

export async function checkFreeTrialDuration(req: Request, team: Team) {}

export async function checkStripeSubscription(req: Request, team: Team) {}

export function passPaywall<T>(response: T): MayTriggerPaywall<T> {
  return { paywall: "pass", response };
}

export async function maybeTriggerPaywall<T>(
  req: Request,
  resourceIds: TaggedResourceId[],
  usedSiteFeatures: Record<string, SiteFeature[]>,
  passResponse: T,
  tierFilter?: {
    fn: (f: ApiFeatureTier) => boolean;
    description: PaywallDescription;
  },
  opts?: {
    verifyMonthlyViews: boolean;
  }
): Promise<MayTriggerPaywall<T>> {
  return passPaywall(passResponse);
}

export async function getTeamCurrentPeriodRange(
  team?: Team,
  freeTrialDays = 15
) {
  const now = moment();
  return {
    start: now.startOf("month").unix(),
    end: now.endOf("month").unix(),
  };
}

export async function checkAndResetTeamTrial(
  teamId: TeamId,
  mgr: DbMgr,
  devflags: DevFlagsType
) {}

export const stripe = new Stripe("BAD_KEY", {
  apiVersion: "2020-08-27",
});

export function mkStripeCustomerData(
  team: Team,
  teamUrl?: string,
  syncName?: boolean
) {}

export async function resetStripeCustomer(
  userMgr: DbMgr,
  superMgr: DbMgr,
  team: Team
) {}

export async function syncDataWithStripe(team: Team, host: string) {}
