import {
  ApiFeatureTier,
  ApiTeam,
  BillingFrequency,
  StripePriceId,
} from "@/wab/shared/ApiSchema";
import { assert } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
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

export function checkIsTeamOnFreeTierOrTrial(
  team?: Pick<ApiTeam, "featureTierId" | "onTrial">,
) {
  return (
    !team ||
    !team.featureTierId ||
    team.featureTierId === DEVFLAGS.freeTier.id ||
    team.onTrial
  );
}

/** Returns true for team on paid tiers, excludes teams on free tier. */
export function checkIsTeamOnPaidTier(
  team: Pick<ApiTeam, "featureTierId" | "featureTier" | "onTrial">,
): boolean {
  // The API resolves featureTier from the parent for child organizations.
  const tierId = team.featureTierId || team.featureTier?.id;
  return !!tierId && tierId !== DEVFLAGS.freeTier.id && !team.onTrial;
}

/** Whether the user gets general chat, not only the modes free tiers allow. */
export function canUseChatCopilot(
  email: string | undefined | null,
  team: Pick<ApiTeam, "featureTierId" | "featureTier" | "onTrial"> | undefined,
  devflags: DevFlagsType,
): boolean {
  return (
    isAdminTeamEmail(email, devflags) || (!!team && checkIsTeamOnPaidTier(team))
  );
}

/** Display the authoritative status sent by the server. */
export function getSubscriptionStatus(team: ApiTeam): SubscriptionStatus {
  const freeTier = DEVFLAGS.freeTier;
  switch (team.subscriptionStatus) {
    case "free":
      return { type: "valid", free: true, tier: freeTier };
    case "past_due":
      return {
        type: "invalid",
        errorMsg:
          "Failed to process your credit card. Please go to your team settings and update your credit card information.",
        freeTier,
      };
    case "trial":
    case "paid":
    case "manual":
      assert(team.featureTier, `Missing tier for team ${team.id}`);
      return {
        type: "valid",
        tier: team.featureTier,
        ...(team.subscriptionStatus === "trial" ? { freeTrial: true } : {}),
      };
  }
}

export function calculateBill(
  tier: ApiFeatureTier,
  seats: number,
  billingFrequency: BillingFrequency,
) {
  let basePrice: number;
  let stripeBasePriceId: StripePriceId | null; // null for plans without base price
  let seatPrice: number;
  let stripeSeatPriceId: StripePriceId;
  if (billingFrequency === "year") {
    basePrice = tier.annualBasePrice ?? 0;
    stripeBasePriceId = tier.annualBaseStripePriceId;
    seatPrice = tier.annualSeatPrice;
    stripeSeatPriceId = tier.annualSeatStripePriceId;
  } else {
    basePrice = tier.monthlyBasePrice ?? 0;
    stripeBasePriceId = tier.monthlyBaseStripePriceId;
    seatPrice = tier.monthlySeatPrice;
    stripeSeatPriceId = tier.monthlySeatStripePriceId;
  }

  let stripeSeatsToCharge: number;
  let baseSubtotal: number;
  if (tierIncludesMinSeats(tier)) {
    stripeSeatsToCharge = seats - tier.minUsers;
    baseSubtotal = basePrice;
  } else {
    stripeSeatsToCharge = seats;
    baseSubtotal = basePrice + tier.minUsers * seatPrice;
  }

  const additionalSeats = seats - tier.minUsers;
  const seatSubtotal = additionalSeats * seatPrice;
  const total = baseSubtotal + seatSubtotal;

  return {
    seatPrice,
    additionalSeats,

    stripeBasePriceId,
    stripeSeatPriceId,
    stripeSeatsToCharge,

    baseSubtotal,
    seatSubtotal,
    total,
  };
}

function tierIncludesMinSeats(tier: ApiFeatureTier) {
  return !["Basic", "Growth"].includes(tier.name);
}
