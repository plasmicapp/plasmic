import { analytics } from "@/wab/client/observability";

/** @deprecated use `analytics().track` directly */
export function trackEvent(eventName: string, eventData?: any) {
  analytics().track(eventName, eventData);
}
