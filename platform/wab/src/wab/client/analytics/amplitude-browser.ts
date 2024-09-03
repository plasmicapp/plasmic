import {
  AMPLITUDE_API_KEY,
  AmplitudeAnalytics,
} from "@/wab/shared/analytics/AmplitudeAnalytics";
import type { Analytics } from "@/wab/shared/analytics/Analytics";
import { createInstance, Identify } from "@amplitude/analytics-browser";

/**
 * Initializes Amplitude for a browser.
 *
 * The returned `Analytics` is designed to be a singleton.
 */
export function initAmplitudeBrowser(): Analytics {
  const amplitude = createInstance();
  amplitude.init(AMPLITUDE_API_KEY, {
    autocapture: true,
  });
  return new AmplitudeAnalytics(Identify, amplitude);
}
