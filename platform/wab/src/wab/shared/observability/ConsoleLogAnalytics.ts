import type { Analytics } from "@/wab/shared/observability/Analytics";
import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";

export class ConsoleLogAnalytics extends BaseAnalytics implements Analytics {
  appendBaseEventProperties(newProperties) {
    console.log(`[analytics] appendBaseEventProperties`, newProperties);
    super.appendBaseEventProperties(newProperties);
  }

  setUser(userId) {
    console.log(`[analytics] setUser "${userId}"`);
    super.setUser(userId);
  }

  setAnonymousUser() {
    console.log(`[analytics] setAnonymousUser`);
    super.setAnonymousUser();
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
      this.mergeEventProperties(eventProperties),
      new Error()
    );
  }

  recordSession() {
    console.log(`[analytics] recordSession`);
  }
}
