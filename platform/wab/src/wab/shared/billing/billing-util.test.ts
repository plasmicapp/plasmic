import { _testonly as featureTiers } from "@/wab/server/db/seed/feature-tier";
import {
  ApiFeatureTier,
  ApiTeam,
  ApiTeamSubscription,
  TeamSubscriptionStatus,
} from "@/wab/shared/ApiSchema";
import {
  calculateAllowances,
  calculateBill,
  getMonthlyAllowancePeriod,
  getPastDuePhase,
  getSubscriptionStatus,
} from "@/wab/shared/billing/billing-util";
import { ensure } from "@/wab/shared/common";
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

describe("calculateBill for a seats-only tier with a seat minimum", () => {
  it("charges every seat at the seat price", () => {
    expect(calculateBill(featureTiers.pro2026Ft, 1, "month")).toMatchObject({
      additionalSeats: 0,
      stripeBasePriceId: null,
      stripeSeatsToCharge: 1,
      baseSubtotal: 30,
      seatSubtotal: 0,
      total: 30,
    });
    expect(calculateBill(featureTiers.pro2026Ft, 5, "year")).toMatchObject({
      additionalSeats: 4,
      stripeBasePriceId: null,
      stripeSeatsToCharge: 5,
      baseSubtotal: 288,
      seatSubtotal: 1_152,
      total: 1_440,
    });
  });

  it("matches the tier name case-insensitively", () => {
    const pro2026Ft: ApiFeatureTier = featureTiers.pro2026Ft;
    const tier = { ...pro2026Ft, name: "Pro2026" };
    expect(calculateBill(tier, 1, "month")).toMatchObject({
      stripeSeatsToCharge: 1,
    });
  });
});

describe("calculateAllowances", () => {
  it.each([
    ["teamFt", 8, 2_000, 1_000],
    ["teamFt", 10, 2_500, 1_000],
    ["pro2026Ft", 5, 1_000, 100],
    ["proFt", 4, 600, 100],
    ["starterFt", 3, 300, 10],
    ["growthFt", 8, 2_000, 100],
    ["basicFt", 4, 500, 100],
    ["enterpriseFt", 30, 7_500, 1_000],
  ] as const)("%s with %d seats", (tier, seats, aiCredits, cdnGb) => {
    expect(calculateAllowances(featureTiers[tier], seats)).toEqual({
      monthlyAiCredits: aiCredits,
      monthlyCdnGb: cdnGb,
    });
  });

  it("leaves an allowance unset when the tier doesn't set it", () => {
    const teamFt: ApiFeatureTier = featureTiers.teamFt;
    const tier = {
      ...teamFt,
      monthlyAiCreditsPerSeat: null,
      monthlyCdnGb: null,
    };
    expect(calculateAllowances(tier, 5)).toEqual({
      monthlyAiCredits: null,
      monthlyCdnGb: null,
    });
  });

  it("gives the free tier its allowances for its fixed seats", () => {
    const freeTier = DEVFLAGS.freeTier;
    const seats = ensure(freeTier.maxUsers, "free tier has fixed seats");
    expect(calculateAllowances(freeTier, seats)).toEqual({
      monthlyAiCredits: 0,
      monthlyCdnGb: 1,
    });
  });
});

describe("getMonthlyAllowancePeriod", () => {
  const period = (anchor: string, now: string) => {
    const { start, end } = getMonthlyAllowancePeriod(
      Temporal.Instant.from(anchor),
      Temporal.Instant.from(now),
    );
    return [start.toString(), end.toString()];
  };

  it("rounds the anchor down to the hour", () => {
    expect(period("2026-03-10T14:25:31Z", "2026-03-20T00:00:00Z")).toEqual([
      "2026-03-10T14:00:00Z",
      "2026-04-10T14:00:00Z",
    ]);
  });

  it("starts a period at its first instant", () => {
    const anchor = "2026-03-10T14:25:31Z";
    expect(period(anchor, "2026-04-10T13:59:59.999Z")[0]).toBe(
      "2026-03-10T14:00:00Z",
    );
    expect(period(anchor, "2026-04-10T14:00:00Z")[0]).toBe(
      "2026-04-10T14:00:00Z",
    );
    // Before Stripe's renewal at 14:25:31, but after the rounded anchor.
    expect(period(anchor, "2026-05-10T14:10:00Z")[0]).toBe(
      "2026-05-10T14:00:00Z",
    );
  });

  it("keeps the anchor's day after months that are too short for it", () => {
    const anchor = "2027-01-31T09:00:00Z";
    expect(period(anchor, "2027-02-15T00:00:00Z")).toEqual([
      "2027-01-31T09:00:00Z",
      "2027-02-28T09:00:00Z",
    ]);
    expect(period(anchor, "2027-03-01T00:00:00Z")).toEqual([
      "2027-02-28T09:00:00Z",
      "2027-03-31T09:00:00Z",
    ]);
    expect(period(anchor, "2027-04-15T00:00:00Z")).toEqual([
      "2027-03-31T09:00:00Z",
      "2027-04-30T09:00:00Z",
    ]);
    // Leap year
    expect(period(anchor, "2028-02-29T10:00:00Z")).toEqual([
      "2028-02-29T09:00:00Z",
      "2028-03-31T09:00:00Z",
    ]);
  });

  it("uses monthly periods across years, as on yearly plans", () => {
    expect(period("2026-11-20T23:59:00Z", "2028-01-05T00:00:00Z")).toEqual([
      "2027-12-20T23:00:00Z",
      "2028-01-20T23:00:00Z",
    ]);
  });

  it("continues periods backwards before the anchor", () => {
    expect(period("2026-06-15T12:00:00Z", "2026-06-01T00:00:00Z")).toEqual([
      "2026-05-15T12:00:00Z",
      "2026-06-15T12:00:00Z",
    ]);
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
