import { AmplitudeAnalytics } from "@/wab/shared/observability/AmplitudeAnalytics";
import type { Analytics } from "@/wab/shared/observability/Analytics";
import { createInstance, Identify } from "@amplitude/analytics-node";

/**
 * Initializes Amplitude for a Node server environment.
 *
 * The returned function produces {@link Analytics}.
 * The `Analytics` is designed to be scoped per request.
 */
export function initAmplitudeNode(opts: { apiKey: string }): () => Analytics {
  const amplitude = createInstance();
  amplitude.init(opts.apiKey);
  return () => new AmplitudeAnalytics(Identify, amplitude);
}
