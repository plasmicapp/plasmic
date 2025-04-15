import { unexpected } from "@/wab/shared/common";
import { Analytics, Properties } from "@/wab/shared/observability/Analytics";
import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";
import { PostHog } from "posthog-node";

/**
 * Initializes Posthog for a Node server environment.
 *
 * The returned function produces {@link Analytics}.
 * The `Analytics` is designed to be scoped per request.
 */
export function initPosthogNode(opts: {
  apiKey: string;
  apiHost: string;
}): () => Analytics {
  const ph = new PostHog(opts.apiKey, {
    host: opts.apiHost,
  });

  return () => new PostHogNodeAnalytics(ph);
}

class PostHogNodeAnalytics extends BaseAnalytics implements Analytics {
  constructor(private readonly ph: PostHog) {
    super();
  }

  identify(userId: string, userProperties: Properties) {
    this.ph.identify({
      distinctId: userId,
      properties: userProperties,
    });
    this.setUser(userId);
  }

  doTrack(eventName: string, eventProperties?: Properties) {
    this.ph.capture({
      distinctId: this.userId,
      event: eventName,
      properties: eventProperties,
    });
  }

  recordSession() {
    unexpected();
  }
}
