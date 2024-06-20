import L from "lodash";
import { useEffect } from "react";

const reservedProps = [
  /**
   * Segment reserved properties
   * https://segment.com/docs/connections/spec/track/
   */
  "revenue",
  "currency",
  "value",
  /**
   * Mixpanel reserved properties
   * https://help.mixpanel.com/hc/en-us/articles/360001355266-Event-Properties
   */
  "distinct_id",
  "ip",
  "token",
  "time",
  "length",
  "campaign_id",
  "city",
  "region",
  "country",
  "bucket",
  "message_id",
].map((k) => k.toLowerCase());

export function trackEvent(eventName: string, eventData?: any) {
  // Just show warnings, don't block the track
  if (!!eventData) {
    const reserved = L.keys(eventData)
      .map((k) => k.toLowerCase())
      .filter((k) => reservedProps.includes(k));
    if (reserved.length > 0) {
      console.warn(
        `track(${eventName}, ${eventData}) might behave unexpectedly because the following are reserved properties: ${reserved}`
      );
    }
  }
  analytics.track(eventName, eventData);
}

export function useTracking() {
  useEffect(() => {
    const clickListener = (event: MouseEvent) => {
      const target = event.target;
      // Filter by PointerEvent; for some reason MouseEvent not always fired
      if (
        event instanceof PointerEvent &&
        (target instanceof HTMLElement || target instanceof SVGElement)
      ) {
        const trackingParent = findTrackingParent(target);
        if (trackingParent) {
          const itemName = trackingParent.dataset.event;
          trackEvent(`mouse-click`, {
            item: itemName,
            ...extractEventProps(trackingParent),
          });
        }
      }
    };
    document.addEventListener("click", clickListener, { capture: true });
    return () => {
      document.removeEventListener("click", clickListener);
    };
  }, []);
}

function findTrackingParent(target: HTMLElement | SVGElement) {
  let cur: HTMLElement | SVGElement | null = target;
  while (cur) {
    if (cur.dataset.event) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

export function extractEventProps(element: EventTarget | null) {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    let cur: HTMLElement | SVGElement | null = element;
    const extra: Record<string, string | undefined> = {};
    while (cur) {
      for (const key of Object.keys(cur.dataset)) {
        if (key.startsWith("event") && key !== "event") {
          extra[key.replace(/^event/, "")] = cur.dataset[key];
        }
      }
      cur = cur.parentElement;
    }
    return extra;
  }
  return undefined;
}
