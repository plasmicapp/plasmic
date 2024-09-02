import {
  AMPLITUDE_API_KEY,
  AmplitudeAnalytics,
} from "@/wab/shared/analytics/AmplitudeAnalytics";
import type { Analytics } from "@/wab/shared/analytics/Analytics";
import { createInstance, Identify } from "@amplitude/analytics-node";

/**
 * Initializes Amplitude for a Node server environment.
 *
 * The returned function produces {@link Analytics}.
 * The `Analytics` is designed to be scoped per request.
 */
export function initAmplitudeNode(): () => Analytics {
  const amplitude = createInstance();
  amplitude.init(AMPLITUDE_API_KEY);
  return () => new AmplitudeAnalytics(Identify, amplitude);
}
