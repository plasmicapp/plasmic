import type { Analytics } from "@/wab/shared/observability/Analytics";
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

export class PostHogAnalytics implements Analytics {
  constructor(readonly ph: PostHog) {}

  appendBaseEventProperties(newProperties) {
    this.ph.register(newProperties);
  }

  setUser(userId) {
    this.ph.identify(userId);
  }

  setAnonymousUser() {
    this.ph.reset();
  }

  identify(userId, userProperties) {
    this.ph.identify(userId, userProperties);
  }

  track(eventName, eventProperties) {
    this.ph.capture(eventName, eventProperties);
  }

  recordSession() {
    this.ph.startSessionRecording();
  }
}
