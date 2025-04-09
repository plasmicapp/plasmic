import type { Properties } from "@/wab/shared/observability/Analytics";

/**
 * For implementing a stateful Analytics implementation that keeps track of the
 * user and base event properties.
 *
 * It's not necessary for libraries that are already stateful.
 */
export abstract class BaseAnalytics {
  protected userId: string = "";
  protected baseEventProperties: Properties = {};

  setUser(userId) {
    this.userId = userId;
  }

  setAnonymousUser() {
    this.userId = "";
  }

  appendBaseEventProperties(newProperties) {
    Object.assign(this.baseEventProperties, newProperties);
  }

  protected mergeEventProperties(eventProperties: Properties) {
    return { ...this.baseEventProperties, ...eventProperties };
  }
}
