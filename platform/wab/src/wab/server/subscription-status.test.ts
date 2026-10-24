import { Team } from "@/wab/server/entities/Entities";
import { deriveSubscriptionStatus } from "@/wab/server/subscription-status";

const team = {
  featureTierId: "tier",
  stripeSubscriptionId: "sub",
  trialStartDate: null,
} as Pick<Team, "featureTierId" | "stripeSubscriptionId" | "trialStartDate">;

describe("deriveSubscriptionStatus", () => {
  it.each([
    ["active", "pm", "paid"],
    ["trialing", "pm", "paid"],
    ["trialing", null, "free"],
    ["past_due", "pm", "past_due"],
    ["unpaid", "pm", "past_due"],
    ["canceled", "pm", "free"],
    ["incomplete", "pm", "free"],
    ["incomplete_expired", "pm", "free"],
    ["paused", "pm", "free"],
  ] as const)(
    "maps Stripe %s with payment method %s to %s",
    (status, paymentMethod, expected) => {
      expect(
        deriveSubscriptionStatus(team, {
          status,
          default_payment_method: paymentMethod,
        }),
      ).toBe(expected);
    },
  );
  it("derives teams without Stripe state from the team row", () => {
    expect(
      deriveSubscriptionStatus({ ...team, featureTierId: null }, null),
    ).toBe("free");
    expect(
      deriveSubscriptionStatus({ ...team, stripeSubscriptionId: null }, null),
    ).toBe("manual");
    expect(
      deriveSubscriptionStatus(
        { ...team, stripeSubscriptionId: null, trialStartDate: new Date() },
        null,
      ),
    ).toBe("trial");
    expect(deriveSubscriptionStatus(team, null)).toBe("paid");
  });
});
