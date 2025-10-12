import type { TrackOptions } from "@/wab/shared/observability/Analytics";
import {
  mergeProperties,
  Properties,
} from "@/wab/shared/observability/Properties";

/**
 * For implementing a stateful Analytics implementation that keeps track of the
 * user and base event properties.
 *
 * It's not necessary for libraries that are already stateful.
 */
export abstract class BaseAnalytics {
  protected userId: string = "";
  protected baseEventProperties: Properties = {};

  setUser(userId: string): void {
    if (userId) {
      this.userId = userId;
    } else {
      // Sometimes we are receiving null/undefined...
      this.setAnonymousUser();
    }
  }

  setAnonymousUser(): void {
    this.userId = "";
  }

  appendBaseEventProperties(newProperties: Properties): void {
    Object.assign(this.baseEventProperties, newProperties);
  }

  track(
    eventName: string,
    eventProperties?: Properties,
    opts?: TrackOptions
  ): void {
    const sampleThreshold = opts?.sampleThreshold;
    if (sampleThreshold === undefined || Math.random() < sampleThreshold) {
      // Merge event properties in this order (last takes precedence):
      // 1. base event properties
      // 2. specific event properties
      // 3. sample threshold property (if present)
      this.doTrack(
        eventName,
        mergeProperties(
          eventProperties,
          sampleThreshold
            ? {
                _sampleThreshold: sampleThreshold,
              }
            : undefined
        )
      );
    }
  }

  protected abstract doTrack(
    eventName: string,
    eventProperties?: Properties
  ): void;
}
