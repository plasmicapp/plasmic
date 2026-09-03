import { _testonly as featureTiers } from "@/wab/server/db/seed/feature-tier";
import { calculateBill } from "@/wab/shared/billing/billing-util";

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
