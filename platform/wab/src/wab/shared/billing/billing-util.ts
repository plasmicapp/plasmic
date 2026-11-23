import {
  ApiFeatureTier,
  ApiTeam,
  ApiTeamSubscription,
  BillingFrequency,
  StripePriceId,
} from "@/wab/shared/ApiSchema";
import { assert } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
import { isPgInteger } from "@/wab/shared/utils/pg-utils";
import { Temporal } from "temporal-polyfill";
import { MakeADT } from "ts-adt/MakeADT";

export const rolePaywallMessage =
  "This project uses Designer or Content creator roles that are not available on its current plan. Change these roles to supported roles in the organization, workspace, or project sharing settings, or upgrade to a plan that includes them.";

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

type PastDueSubscription = Pick<
  ApiTeamSubscription,
  "subscriptionStatus" | "pastDueLastDay" | "pastDuePhaseOverride"
>;

export function getPastDuePhase(
  teamSub: PastDueSubscription,
  now = Temporal.Now.instant(),
): "grace" | "blocked" | null {
  if (teamSub.subscriptionStatus !== "past_due") {
    return null;
  }
  if (
    teamSub.pastDuePhaseOverride === "grace" ||
    teamSub.pastDuePhaseOverride === "blocked"
  ) {
    return teamSub.pastDuePhaseOverride;
  }
  if (!teamSub.pastDueLastDay) {
    return null;
  }
  return Temporal.Instant.compare(
    getPastDueBlocksAt(teamSub.pastDueLastDay),
    now,
  ) <= 0
    ? "blocked"
    : "grace";
}

function isPastDueBlocked(teamSub: PastDueSubscription) {
  return getPastDuePhase(teamSub) === "blocked";
}

export function canUseChatCopilot(
  email: string | undefined | null,
  team: Pick<ApiTeam, "featureTierId" | "featureTier" | "onTrial"> | undefined,
  devflags: DevFlagsType,
  subscription?: PastDueSubscription | null,
): boolean {
  return (
    isAdminTeamEmail(email, devflags) ||
    (!!team &&
      checkIsTeamOnPaidTier(team) &&
      (!subscription || !isPastDueBlocked(subscription))) ||
    (!!email && devflags.chatCopilotFreeDailyTokenLimit > 0)
  );
}

/** Display the authoritative status sent by the server. */
export function getSubscriptionStatus(
  team: Pick<ApiTeam, "id" | "featureTier"> & PastDueSubscription,
): SubscriptionStatus {
  const freeTier = DEVFLAGS.freeTier;
  switch (team.subscriptionStatus) {
    case "free":
      return { type: "valid", free: true, tier: freeTier };
    case "past_due": {
      const lastDay =
        team.pastDueLastDay && Temporal.PlainDate.from(team.pastDueLastDay);
      const editing =
        team.pastDuePhaseOverride === "grace"
          ? "Editing remains available while your payment issue is resolved."
          : isPastDueBlocked(team)
            ? "Editing is paused until payment is made."
            : !lastDay
              ? "Please update your payment method."
              : `Editing is available through ${lastDay.toLocaleString(undefined, { dateStyle: "long" })}. Update your payment method to keep editing.`;
      return {
        type: "invalid",
        errorMsg: `Payment failed. ${editing}`,
        freeTier,
      };
    }
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

/**
 * Plans like Scale have a base price that includes its minimum seats.
 * Plans like Pro (2026) or older legacy plans must be charged for every seat.
 * Names are matched case-insensitively, like getNewPriceTierType.
 */
function tierIncludesMinSeats(tier: ApiFeatureTier) {
  return !["basic", "growth", "pro2026"].includes(tier.name.toLowerCase());
}

// Organization allowances are stored as PostgreSQL integers.
export function isValidMonthlyAllowance(value: unknown): value is number {
  return isPgInteger(value) && value >= 0;
}

/**
 * A team's monthly allowances. An allowance the tier doesn't set stays null,
 * so teams on a tier that hasn't been configured yet can be found and fixed.
 */
export function calculateAllowances(
  tier: ApiFeatureTier,
  seats: number,
): { monthlyAiCredits: number | null; monthlyCdnGb: number | null } {
  return {
    monthlyAiCredits:
      tier.monthlyAiCreditsPerSeat === null
        ? null
        : tier.monthlyAiCreditsPerSeat * seats,
    monthlyCdnGb: tier.monthlyCdnGb,
  };
}

/** End of the last allowed day in UTC-12, the latest timezone. */
export function getPastDueBlocksAt(
  lastDay: Temporal.PlainDate | string,
): Temporal.Instant {
  return Temporal.PlainDate.from(lastDay)
    .add({ days: 1 })
    .toZonedDateTime("-12:00")
    .toInstant();
}

/**
 * The monthly allowance period containing `now`, starting monthly from the
 * billing cycle anchor rounded down to the hour.
 */
export function getMonthlyAllowancePeriod(
  billingCycleAnchor: Temporal.Instant,
  now: Temporal.Instant,
): { start: Temporal.Instant; end: Temporal.Instant } {
  const anchor = billingCycleAnchor
    .toZonedDateTimeISO("UTC")
    .round({ smallestUnit: "hour", roundingMode: "floor" });
  const current = now.toZonedDateTimeISO("UTC");
  // Add months to the anchor itself, not to the previous period's start, so a
  // clamped day doesn't carry over to later months.
  const periodStart = (months: number) => anchor.add({ months });
  let months =
    (current.year - anchor.year) * 12 + (current.month - anchor.month);
  if (Temporal.ZonedDateTime.compare(periodStart(months), current) > 0) {
    months--;
  }
  return {
    start: periodStart(months).toInstant(),
    end: periodStart(months + 1).toInstant(),
  };
}
