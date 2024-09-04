export type Properties = { [key: string]: any };

export interface Analytics {
  /**
   * Associates the user with future events.
   * Same as `identify`, but doesn't allow setting user properties.
   */
  setUser(userId: string);
  /**
   * Associates an anonymous user with future events.
   */
  setAnonymousUser();
  /**
   * Appends properties that will be sent with every event.
   * Properties are overridden by event-level properties.
   */
  appendBaseEventProperties(newProperties: Properties): void;
  /**
   * Records user properties and associates the user with future events.
   */
  identify(userId: string, userProperties: Properties): void;
  /**
   * Tracks an event.
   */
  track(eventName: string, eventProperties?: Properties): void;
  /**
   * Starts recording a session for replay.
   */
  recordSession(): void;
}
