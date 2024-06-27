import { assert, assertNever } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  ApiFeatureTier,
  ApiTeam,
  BillingFrequency,
} from "@/wab/shared/ApiSchema";
import Stripe from "stripe";
import { MakeADT } from "ts-adt/MakeADT";

export type SubscriptionStatus = MakeADT<
  "type",
  {
    // Valid subscription, with a flag telling us whether it's a free tier
    valid: { free?: boolean; tier: ApiFeatureTier; freeTrial?: boolean };
    // Subscription is in a broken state. Ask the user to cancel and start over
    invalid: {
      errorMsg: string;
      freeTier: ApiFeatureTier;
    };
  }
>;

/**
 * Given a team and Stripe subscription, determine the status of my account
 */
export function getSubscriptionStatus(
  team: ApiTeam,
  availFeatureTiers: ApiFeatureTier[],
  subscription?: Stripe.Subscription
): SubscriptionStatus {
  const freeTier = DEVFLAGS.freeTier;

  // Handle free tier
  if (!team.featureTier) {
    assert(
      !team.stripeSubscriptionId,
      `Found a Stripe subscription without a feature tier for teamId=${team.id}`
    );
    return {
      type: "valid",
      free: true,
      tier: freeTier,
    };
  }

  // Implicitly team.featureTier is defined by here

  // Check if it's a free trial
  if (!team.stripeSubscriptionId) {
    return {
      type: "valid",
      tier: team.featureTier,
      freeTrial: true,
    };
  }
  assert(
    !!team.stripeSubscriptionId && !!subscription,
    `Found team.featureTier without a corresponding subscription for teamId=${team.id}`
  );
  // team.featureTier and subscription are both defined by here

  if (
    ["canceled", "incomplete", "incomplete_expired"].includes(
      subscription.status
    )
  ) {
    // Stay on the free tier if we have canceled or incomplete subs
    return {
      type: "valid",
      free: true,
      tier: freeTier,
    };
  } else if (["past_due", "unpaid"].includes(subscription.status)) {
    // You'll be downgraded to free tier until you fix your credit card
    return {
      type: "invalid",
      errorMsg:
        "Failed to process your credit card. Please go to your team settings and update your credit card information.",
      freeTier,
    };
  }

  // Passed all the checks!
  return { type: "valid", tier: team.featureTier };
}

/**
 * Exhaustive type check for Stripe subscription status,
 * so that we can detect when Stripe API changes
 * TODO:
 * Right now we just allow anything other than canceled or incomplete subs
 * to be valid, and require manual checking Stripe dashboard for unpaid bills
 * @param sub
 * @returns boolean
 */
export const isValidSubscriptionStatus = (
  sub: Stripe.Subscription
): boolean => {
  const state = sub.status;
  if (state === "active" || state === "past_due" || state === "unpaid") {
    return true;
  } else if (
    state === "canceled" ||
    state === "incomplete" ||
    state === "incomplete_expired"
  ) {
    return false;
  } else if (state === "trialing") {
    return !!sub.default_payment_method;
  } else {
    assertNever(state);
  }
};

export function calculateRecurringBill(
  tier: ApiFeatureTier,
  seats: number,
  billingFrequency: BillingFrequency,
  basePriceIncludesSeats: boolean
) {
  const baseUnit =
    billingFrequency === "year" ? tier.annualBasePrice : tier.monthlyBasePrice;
  const seatUnit =
    billingFrequency === "year" ? tier.annualSeatPrice : tier.monthlySeatPrice;
  const recurringBillTotal =
    (baseUnit ?? 0) +
    seatUnit * (basePriceIncludesSeats ? seats - tier.minUsers : seats);
  return recurringBillTotal;
}
