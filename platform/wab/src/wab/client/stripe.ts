import { ENV } from "@/wab/client/env";
import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | undefined;
export function getStripePromise() {
  if (stripePromise) {
    return stripePromise;
  }

  if (ENV.STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(ENV.STRIPE_PUBLISHABLE_KEY);
  } else {
    stripePromise = new Promise(() => {
      console.warn("STRIPE_PUBLISHABLE_KEY missing");
    });
  }
  return stripePromise;
}
