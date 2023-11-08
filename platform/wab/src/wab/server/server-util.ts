import * as Sentry from "@sentry/node";

export function logError(error: Error, eventName?: string) {
  console.log("Error", eventName ?? error.name, error);
  Sentry.captureException(error);
}
