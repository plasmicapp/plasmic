import type { TrackOptions } from "@/wab/shared/observability/Analytics";
import { Properties } from "@/wab/shared/observability/Properties";

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
    this.userId = userId;
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
        this.mergeEventProperties(
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

  private mergeEventProperties(p1?: Properties, p2?: Properties): Properties {
    return { ...this.baseEventProperties, ...p1, ...p2 };
  }
}
