import { unexpected } from "@/wab/shared/common";
import { Analytics } from "@/wab/shared/observability/Analytics";
import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";
import { Properties } from "@/wab/shared/observability/Properties";
import { PostHog } from "posthog-node";

const ANONYMOUS_DISTINCT_ID = "panonymous";

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
  if (process.env.NODE_ENV === "development") {
    ph.debug(true);
  }

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
      distinctId: this.userId || ANONYMOUS_DISTINCT_ID,
      event: eventName,
      properties: {
        ...eventProperties,

        // PostHog's backend SDKs and API capture identified events by default.
        // To capture anonymous events, set the $process_person_profile property to false.
        // https://posthog.com/docs/data/anonymous-vs-identified-events
        $process_person_profile: !!this.userId,
      },
    });
  }

  recordSession() {
    unexpected();
  }
}
