import { ENV } from "@/wab/client/env";
import { spawn } from "@/wab/shared/common";
import type { Analytics } from "@/wab/shared/observability/Analytics";
import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";
import { Properties } from "@/wab/shared/observability/Properties";
import { noop } from "lodash";
import type { PostHog, PostHogConfig } from "posthog-js";

/**
 * Initializes Posthog for a browser.
 *
 * The returned `Analytics` is designed to be a singleton.
 */
export function initPosthogBrowser(opts: {
  apiKey: string;
  host: string;
  reverseProxyHost?: string;
  config?: Partial<PostHogConfig>;
}): PostHogAnalytics {
  const ph = import("posthog-js").then(({ posthog }) => {
    const instance = posthog.init(opts.apiKey, {
      api_host: opts.reverseProxyHost || opts.host,
      ui_host: opts.host,
      autocapture: false, // disable because it causes too many events
      disable_session_recording: true, // enable with `recordSession`
      ...opts.config,
    });
    if (ENV.NODE_ENV === "development") {
      instance.debug(true);
    }
    return instance;
  });
  return new PostHogAnalytics(ph);
}

export class PostHogAnalytics extends BaseAnalytics implements Analytics {
  constructor(readonly ph: Promise<PostHog>) {
    super();
  }

  appendBaseEventProperties(newProperties: Properties) {
    this.withPh((ph) => ph.register(newProperties));
  }

  setUser(userId: string) {
    this.withPh((ph) => ph.identify(userId));
  }

  setAnonymousUser() {
    this.withPh((ph) => ph.reset());
  }

  identify(userId: string, userProperties: Properties) {
    this.withPh((ph) => ph.identify(userId, userProperties));
  }

  doTrack(eventName: string, eventProperties?: Properties): void {
    this.withPh((ph) => ph.capture(eventName, eventProperties));
  }

  recordSession() {
    this.withPh((ph) => ph.startSessionRecording());
  }

  private withPh(f: (ph: PostHog) => void) {
    spawn(this.ph.then(f, noop));
  }
}
