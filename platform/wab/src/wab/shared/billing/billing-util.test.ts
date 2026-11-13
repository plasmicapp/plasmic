import { _testonly as featureTiers } from "@/wab/server/db/seed/feature-tier";
import {
  ApiTeam,
  ApiTeamSubscription,
  TeamSubscriptionStatus,
} from "@/wab/shared/ApiSchema";
import {
  calculateBill,
  getPastDuePhase,
  getSubscriptionStatus,
} from "@/wab/shared/billing/billing-util";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Temporal } from "temporal-polyfill";

describe("calculateBill", () => {
  it("works for current feature tier", () => {
    expect(calculateBill(featureTiers.teamFt, 12, "year")).toEqual({
      seatPrice: 384,
      additionalSeats: 4,

      stripeBasePriceId: featureTiers.teamFt.annualBaseStripePriceId,
      stripeSeatPriceId: featureTiers.teamFt.annualSeatStripePriceId,
      stripeSeatsToCharge: 4,

      baseSubtotal: 4_788,
      seatSubtotal: 1_536,
      total: 6_324,
    });
  });
  it("works for legacy feature tier that does not include minUsers", () => {
    expect(calculateBill(featureTiers.growthFt, 9, "month")).toEqual({
      seatPrice: 40,
      additionalSeats: 1,

      stripeBasePriceId: featureTiers.growthFt.monthlyBaseStripePriceId,
      stripeSeatPriceId: featureTiers.growthFt.monthlySeatStripePriceId,
      stripeSeatsToCharge: 9,

      baseSubtotal: 480,
      seatSubtotal: 40,
      total: 520,
    });
  });
  it("works for legacy seats-only feature tier", () => {
    expect(calculateBill(featureTiers.basicSeatsOnly, 3, "month")).toEqual({
      seatPrice: 15,
      additionalSeats: 3,

      stripeBasePriceId: featureTiers.basicSeatsOnly.monthlyBaseStripePriceId,
      stripeSeatPriceId: featureTiers.basicSeatsOnly.monthlySeatStripePriceId,
      stripeSeatsToCharge: 3,

      baseSubtotal: 0,
      seatSubtotal: 45,
      total: 45,
    });
  });
});

describe("getSubscriptionStatus", () => {
  const tier = { ...DEVFLAGS.freeTier, id: "team-tier", name: "Team" };
  it.each<[TeamSubscriptionStatus, object]>([
    ["paid", { type: "valid", tier }],
    ["manual", { type: "valid", tier }],
    ["trial", { type: "valid", tier, freeTrial: true }],
    ["free", { type: "valid", tier: DEVFLAGS.freeTier, free: true }],
    [
      "past_due",
      {
        type: "invalid",
        errorMsg: expect.stringContaining("Payment failed."),
        freeTier: DEVFLAGS.freeTier,
      },
    ],
  ])("displays %s", (subscriptionStatus, expected) => {
    expect(
      getSubscriptionStatus({
        id: "team",
        subscriptionStatus,
        featureTier: tier,
      } as ApiTeam & ApiTeamSubscription),
    ).toEqual(expected);
  });
});

describe("getPastDuePhase", () => {
  const sub = {
    subscriptionStatus: "past_due" as const,
    pastDueLastDay: "2026-12-31",
  };

  it("allows the entire last day even in UTC-12", () => {
    expect(
      getPastDuePhase(sub, Temporal.Instant.from("2027-01-01T11:59:59.999Z")),
    ).toBe("grace");
    expect(
      getPastDuePhase(sub, Temporal.Instant.from("2027-01-01T12:00:00Z")),
    ).toBe("blocked");
  });

  it("honors overrides only while past due, including without a deadline", () => {
    const now = Temporal.Instant.from("2027-01-02T12:00:00Z");
    expect(
      getPastDuePhase({ ...sub, pastDuePhaseOverride: "grace" }, now),
    ).toBe("grace");
    expect(
      getPastDuePhase(
        { ...sub, pastDueLastDay: null, pastDuePhaseOverride: "blocked" },
        now,
      ),
    ).toBe("blocked");
    expect(
      getPastDuePhase(
        { ...sub, subscriptionStatus: "paid", pastDuePhaseOverride: "blocked" },
        now,
      ),
    ).toBeNull();
    expect(
      getSubscriptionStatus({
        ...sub,
        id: "team" as ApiTeam["id"],
        featureTier: null,
        pastDuePhaseOverride: "grace",
      }),
    ).toMatchObject({
      errorMsg:
        "Payment failed. Editing remains available while your payment issue is resolved.",
    });
  });

  it("ignores paid subscriptions and missing deadlines", () => {
    expect(getPastDuePhase({ ...sub, subscriptionStatus: "paid" })).toBeNull();
    expect(getPastDuePhase({ ...sub, pastDueLastDay: null })).toBeNull();
  });
});
