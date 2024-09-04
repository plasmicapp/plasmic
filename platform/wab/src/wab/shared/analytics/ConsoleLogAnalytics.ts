import type { Analytics, Properties } from "@/wab/shared/analytics/Analytics";

export class ConsoleLogAnalytics implements Analytics {
  private userId: string = "";
  private baseEventProperties: Properties = {};

  appendBaseEventProperties(newProperties) {
    console.log(`[analytics] appendBaseEventProperties`, newProperties);
    Object.assign(this.baseEventProperties, newProperties);
  }

  setUser(userId) {
    console.log(`[analytics] setUser "${userId}"`);
    this.userId = userId;
  }

  setAnonymousUser() {
    console.log(`[analytics] setAnonymousUser`);
    this.userId = "";
  }

  identify(userId, userProperties) {
    console.log(`[analytics] identify "${userId}"`, userProperties);
    this.userId = userId;
  }

  track(eventName, eventProperties) {
    console.log(
      `[analytics] track user "${
        this.userId || "anonymous"
      }" event "${eventName}"`,
      { ...this.baseEventProperties, ...eventProperties }
    );
  }

  recordSession() {
    console.log(`[analytics] recordSession`);
  }
}
