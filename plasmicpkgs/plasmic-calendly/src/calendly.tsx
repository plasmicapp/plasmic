import { CodeComponentMeta } from "@plasmicapp/host";

import React, { useEffect, useRef, useState } from "react";

import { InlineWidget, PopupWidget } from "react-calendly";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-calendly";

interface CalendlyInlineWidgetProps {
  accountLink: string;
  hideEventTypeDetails?: boolean;
  hideGdprBanner?: boolean;
  hideLandingPageDetails?: boolean;
  className?: string;
}

export const CalendlyInlineWidgetMeta: CodeComponentMeta<CalendlyInlineWidgetProps> =
  {
    name: "hostless-calendly-inline-widget",
    displayName: "Calendly Inline Widget",
    importName: "CalendlyInlineWidget",
    importPath: modulePath,
    providesData: true,
    defaultStyles: {
      height: "700px",
      width: "600px",
    },
    props: {
      accountLink: {
        type: "string",
        displayName: "Link",
        description:
          "The Link of your Calendly account. Get it from (https://calendly.com/account/settings/link)",
        defaultValue: "plasmic-calendly-demo",
      },
      hideEventTypeDetails: {
        type: "boolean",
        displayName: "Hide Event Type",
        description: "Hide Details of the Event Type",
        defaultValue: false,
      },
      hideGdprBanner: {
        type: "boolean",
        displayName: "Hide Cookie Banner",
        description: "Hide Cookie Banner",
        defaultValue: false,
      },
      hideLandingPageDetails: {
        type: "boolean",
        displayName: "Hide Details",
        description: "Hide Details of the LandingPage",
        defaultValue: false,
      },
    },
  };

export function CalendlyInlineWidget({
  accountLink,
  hideEventTypeDetails,
  hideGdprBanner,
  hideLandingPageDetails,
  className,
}: CalendlyInlineWidgetProps) {
  if (!accountLink) {
    return <div>Please enter the the URL of your Calendly Account</div>;
  }

  return (
    <div className={className}>
      <InlineWidget
        pageSettings={{
          hideEventTypeDetails,
          hideGdprBanner,
          hideLandingPageDetails,
        }}
        url={`https://calendly.com/${accountLink}`}
      />
    </div>
  );
}

interface CalendlyCornerPopupProps {
  accountLink: string;
  text?: string;
  textColor?: string;
  color: string;
  branding?: boolean;
  hideEventTypeDetails?: boolean;
  hideGdprBanner?: boolean;
  hideLandingPageDetails?: boolean;
  className?: string;
}

export const CalendlyCornerPopupMeta: CodeComponentMeta<CalendlyCornerPopupProps> =
  {
    name: "hostless-calendly-corner-popup",
    displayName: "Calendly Corner Popup ",
    importName: "CalendlyCornerPopup",
    description: "Shows Popup button on corner of the webpage",
    importPath: modulePath,
    providesData: true,
    styleSections: ["visibility"],
    props: {
      accountLink: {
        type: "string",
        displayName: "Link or Page",
        description:
          "The Link of your Calendly account. Get it from (https://calendly.com/account/settings/link)",
        defaultValue: "plasmic-calendly-demo",
      },
      text: {
        type: "string",
        displayName: "Text",
        description: "Text of the PopupWidget",
        defaultValue: "Open Calendly",
      },
      color: {
        type: "color",
        displayName: "Color",
        description: "Color of the PopupWidget.",
      },
      textColor: {
        type: "color",
        displayName: "Text Color",
        description: "Color of the text",
      },
      branding: {
        type: "boolean",
        displayName: "Brand",
        description: "Hide/Show brand of Calendly",
        defaultValue: true,
      },
      hideEventTypeDetails: {
        type: "boolean",
        displayName: "Event Type",
        description: "Hide/Show details of the event type",
        defaultValue: false,
      },
      hideGdprBanner: {
        type: "boolean",
        displayName: "Cookie Banner",
        description: "Hide/Show Cookie Banner",
        defaultValue: false,
      },
      hideLandingPageDetails: {
        type: "boolean",
        displayName: "Details",
        description: "Hide/Show Details of the LandingPage",
        defaultValue: false,
      },
    },
  };

export function CalendlyCornerPopup({
  accountLink,
  branding,
  text,
  color,
  hideEventTypeDetails,
  hideGdprBanner,
  hideLandingPageDetails,
  textColor,
  className,
}: CalendlyCornerPopupProps) {
  if (!accountLink) {
    return <div>Please enter the the URL of your Calendly Account</div>;
  }

  const container = useRef<HTMLDivElement>(null);
  const [wrapper, setWrapper] = useState(container.current);
  useEffect(() => {
    setWrapper(container.current);
  }, [container]);

  return (
    <div className={className} ref={container}>
      <PopupWidget
        branding={branding}
        color={color}
        pageSettings={{
          hideEventTypeDetails,
          hideGdprBanner,
          hideLandingPageDetails,
        }}
        rootElement={wrapper!}
        text={text!}
        textColor={textColor}
        url={`https://calendly.com/${accountLink}`}
      />
    </div>
  );
}
