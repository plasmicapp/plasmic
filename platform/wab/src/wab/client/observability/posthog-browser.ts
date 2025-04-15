import type {
  Analytics,
  Properties,
} from "@/wab/shared/observability/Analytics";
import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";
import { posthog, PostHog, PostHogConfig } from "posthog-js";

/**
 * Initializes Posthog for a browser.
 *
 * The returned `Analytics` is designed to be a singleton.
 */
export function initPosthogBrowser(opts: {
  apiKey: string;
  apiHost: string;
  config: Partial<PostHogConfig>;
}): PostHogAnalytics {
  const ph = posthog.init(opts.apiKey, {
    api_host: opts.apiHost,
    autocapture: false, // disable because it causes too many events
    disable_session_recording: true, // enable with `recordSession`
    ...opts.config,
  });
  return new PostHogAnalytics(ph);
}

export class PostHogAnalytics extends BaseAnalytics implements Analytics {
  constructor(readonly ph: PostHog) {
    super();
  }

  appendBaseEventProperties(newProperties: Properties) {
    this.ph.register(newProperties);
  }

  setUser(userId: string) {
    this.ph.identify(userId);
  }

  setAnonymousUser() {
    this.ph.reset();
  }

  identify(userId: string, userProperties: Properties) {
    this.ph.identify(userId, userProperties);
  }

  doTrack(eventName: string, eventProperties?: Properties): void {
    this.ph.capture(eventName, eventProperties);
  }

  recordSession() {
    this.ph.startSessionRecording();
  }
}
