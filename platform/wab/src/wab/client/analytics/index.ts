import type { Analytics } from "@/wab/shared/analytics/Analytics";
import { ensure } from "@/wab/shared/common";

let globalAnalytics: Analytics;

export function analytics(): Analytics {
  return globalAnalytics;
}

export function initBrowserAnalytics(analyticsInstance: Analytics) {
  ensure(globalAnalytics === undefined, "Cannot initialize analytics twice");
  globalAnalytics = analyticsInstance;
}
