import { ensure } from "@/wab/shared/common";

/**
 * Environment variables defined at build-time in rsbuild.config.ts.
 */
export const ENV = {
  NODE_ENV: ensure(process.env.NODE_ENV, "NODE_ENV must be defined"),
  COMMITHASH: ensure(process.env.COMMITHASH, "COMMITHASH must be defined"),
  PUBLICPATH: ensure(process.env.PUBLICPATH, "PUBLICPATH must be defined"),
  AMPLITUDE_API_KEY: process.env.AMPLITUDE_API_KEY,
  INTERCOM_APP_ID: process.env.INTERCOM_APP_ID,
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
  POSTHOG_HOST: process.env.POSTHOG_HOST,
  POSTHOG_REVERSE_PROXY_HOST: process.env.POSTHOG_REVERSE_PROXY_HOST,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ORG_ID: process.env.SENTRY_ORG_ID,
  SENTRY_PROJECT_ID: process.env.SENTRY_PROJECT_ID,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
};

if (ENV.NODE_ENV === "development") {
  console.log("Printing ENV in development", ENV);
}
