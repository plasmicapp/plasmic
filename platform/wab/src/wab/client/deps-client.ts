import { loadStripe, Stripe } from "@stripe/stripe-js";
import DeploymentFlags from "../DeploymentFlags";

// Stripe
const stripeProdPublicKey = "pk_live_s4L5mrGSii9v1JNt1CPrXPxv00yncZqGGV";
const stripeDevPublicKey = "pk_test_SOZVG9LinN9CyJw5L6EVwjw900S3OEL9bt";
export function getStripePublicKey() {
  return DeploymentFlags.DEPLOYENV === "production"
    ? stripeProdPublicKey
    : stripeDevPublicKey;
}
let stripePromise: Promise<Stripe | null> | undefined;
export function getStripePromise() {
  if (stripePromise) {
    return stripePromise;
  }
  stripePromise = loadStripe(getStripePublicKey());
  return stripePromise;
}
