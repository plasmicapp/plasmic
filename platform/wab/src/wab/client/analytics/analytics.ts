import { initBrowserAnalytics } from "@/wab/client/analytics/index";
import { methodForwarder } from "@/wab/commons/methodForwarder";
import { Analytics } from "@/wab/shared/analytics/Analytics";

export function initAnalytics(production: boolean) {
  const analytics = methodForwarder<Analytics>();
  initBrowserAnalytics(analytics);
  return { amplitudeAnalytics: analytics, posthogAnalytics: analytics };
}
