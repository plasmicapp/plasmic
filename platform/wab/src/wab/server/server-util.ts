import { logger } from "@/wab/server/observability";
import * as Sentry from "@sentry/node";

export function logError(error: Error, eventName?: string) {
  logger().error("An error has occurred", error);
  Sentry.captureException(error);
}
