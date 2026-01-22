import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";

import React from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-hubspot";

interface HubspotSignupFormProps {
  className?: string;
  url?: string;
}

export const HubspotSignupFormMeta: CodeComponentMeta<HubspotSignupFormProps> =
  {
    name: "hostless-hubspot-signup-form",
    displayName: "Hubspot Signup Form",
    importName: "HubspotSignupForm",
    importPath: modulePath,
    providesData: true,
    description:
      "Shows a sign up form to users for subscribe your to newsletter",
    props: {
      url: {
        type: "string",
        displayName: "URL",
        description: `Copy your share link from your Hubspot form.Learn how ("https://knowledge.hubspot.com/forms/how-can-i-share-a-hubspot-form-if-im-using-an-external-site")`,
        defaultValue: "https://share.hsforms.com/1Y7nnYY8aSkuXgoeWA16-ZQdvi9r",
        helpText: `You can learn how to get share link.("https://knowledge.hubspot.com/forms/how-can-i-share-a-hubspot-form-if-im-using-an-external-site")`,
      },
    },
  };

export function HubspotSignupForm({ className, url }: HubspotSignupFormProps) {
  return (
    <iframe
      src={url}
      width="100%"
      frameBorder="0"
      marginHeight={0}
      scrolling="no"
      marginWidth={0}
      height="600px"
      className={className}
    />
  );
}
