import type {
  Analytics,
  TrackOptions,
} from "@/wab/shared/observability/Analytics";
import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";
import { Properties } from "@/wab/shared/observability/Properties";

export class ConsoleLogAnalytics extends BaseAnalytics implements Analytics {
  appendBaseEventProperties(newProperties: Properties): void {
    console.log(`[analytics] appendBaseEventProperties`, newProperties);
    super.appendBaseEventProperties(newProperties);
  }

  setUser(userId: string): void {
    console.log(`[analytics] setUser "${userId}"`);
    super.setUser(userId);
  }

  setAnonymousUser(): void {
    console.log(`[analytics] setAnonymousUser`);
    super.setAnonymousUser();
  }

  identify(userId: string, userProperties: Properties): void {
    console.log(`[analytics] identify "${userId}"`, userProperties);
    this.userId = userId;
  }

  track(
    eventName: string,
    eventProperties: Properties,
    opts?: TrackOptions
  ): void {
    if (opts?.sampleThreshold !== undefined) {
      console.log(
        `[analytics] "${eventName}" sample threshold ${opts.sampleThreshold}`
      );
    }
    super.track(eventName, eventProperties, opts);
  }

  protected doTrack(eventName: string, eventProperties?: Properties): void {
    console.log(
      `[analytics] track user "${
        this.userId || "anonymous"
      }" event "${eventName}"`,
      eventProperties,
      new Error()
    );
  }

  recordSession(): void {
    console.log(`[analytics] recordSession`);
  }
}
