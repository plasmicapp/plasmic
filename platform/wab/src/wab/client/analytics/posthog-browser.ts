import type { Analytics } from "@/wab/shared/analytics/Analytics";
import { posthog, PostHog, PostHogConfig } from "posthog-js";

/** This is a write-only API key that is publicly exposed. */
const POSTHOG_API_KEY = "phc_eaI1hFsPRIZkmwrXaSGRNDh4H9J3xdh1j9rgNy27NgP";

/**
 * Initializes Posthog for a browser.
 *
 * The returned `Analytics` is designed to be a singleton.
 */
export function initPosthogBrowser(
  config: Partial<PostHogConfig>
): PostHogAnalytics | undefined {
  const ph = posthog.init(POSTHOG_API_KEY, {
    api_host: "https://us.i.posthog.com",
    autocapture: false, // disable because it causes too many events
    disable_session_recording: true, // enable with `recordSession`
    ...config,
  });
  if (!ph) {
    console.warn("posthog.init failed");
    return undefined;
  }

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
