import { analytics } from "@/wab/client/analytics";

/** @deprecated use `analytics().track` directly */
export function trackEvent(eventName: string, eventData?: any) {
  analytics().track(eventName, eventData);
}
