import { CodeComponentMeta } from "@plasmicapp/host";

import React from "react";
import useEventbrite from "./hooks/useEventBrite";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-eventbrite";

interface EventbriteProps {
  className?: string;
  eventId?: string;
  text?: string;
}

export const EventbriteMeta: CodeComponentMeta<EventbriteProps> = {
  name: "hostless-eventbrite",
  displayName: "EventBrite",
  importName: "Eventbrite",
  importPath: modulePath,
  providesData: true,
  description: "Shows Eventbrite checkout on your website",
  defaultStyles: {
    color: "#ffffff",
    fontSize: "12px",
    width: "100px",
    height: "25px",
    borderWidth: "0px",
    backgroundColor: "#19aee7",
    borderRadius: "4px",
  },
  props: {
    eventId: {
      type: "string",
      displayName: "Event ID",
      description: `Learn how to get event ID ("https://www.eventbrite.com/platform/docs/events")`,
      defaultValue: "463676879027",
      helpText:
        "In the URL field at the top, you see something like https://www.eventbrite.com/myevent?eid=123456789 . The number after eid= is the Event ID",
    },
    text: {
      type: "string",
      displayName: "Label",
      description: "Label",
      defaultValue: "Buy tickets",
    },
  },
};

export function Eventbrite({ className, text, eventId }: EventbriteProps) {
  if (!eventId) {
    return <div>Please enter Event Id</div>;
  }

  const handleOrderCompleted = React.useCallback(() => {
    console.log("Order was completed successfully");
  }, []);

  const modalButtonCheckout = useEventbrite({
    eventId: `${eventId!}`,
    modal: true,
    onOrderComplete: handleOrderCompleted,
  });

  return (
    <button className={className} id={modalButtonCheckout?.id} type="button">
      {text}
    </button>
  );
}
