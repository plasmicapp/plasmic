import { PostHogAnalytics } from "@/wab/client/analytics/posthog-browser";

export function initMonitoring(
  production: boolean,
  integrations: { posthogAnalytics?: PostHogAnalytics }
) {}
