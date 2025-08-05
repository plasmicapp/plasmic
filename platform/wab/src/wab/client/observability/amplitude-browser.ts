import { AmplitudeAnalytics } from "@/wab/shared/observability/AmplitudeAnalytics";
import type { Analytics } from "@/wab/shared/observability/Analytics";
import { createInstance, Identify } from "@amplitude/analytics-browser";

/**
 * Initializes Amplitude for a browser.
 *
 * The returned `Analytics` is designed to be a singleton.
 */
export function initAmplitudeBrowser(opts: { apiKey: string }): Analytics {
  const amplitude = createInstance();
  amplitude.init(opts.apiKey, {
    // TODO: Turned off because of PLA-12018
    autocapture: false,
  });
  return new AmplitudeAnalytics(Identify, amplitude);
}
