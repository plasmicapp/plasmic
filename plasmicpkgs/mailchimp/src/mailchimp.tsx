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

const modulePath = "@plasmicpkgs/plasmic-mailchimp";

interface MailchimpSignupFormProps {
  className?: string;
  url?: string;
}

export const MailchimpSignupFormMeta: CodeComponentMeta<MailchimpSignupFormProps> =
  {
    name: "hostless-mailchimp-signup-form",
    displayName: "Mailchimp Signup Form",
    importName: "MailchimpSignupForm",
    importPath: modulePath,
    providesData: true,
    description:
      "Shows a sign up form to users for subscribe to your newsletter",
    props: {
      url: {
        type: "string",
        displayName: "URL",
        description: `Learn how to get your form url ("https://mailchimp.com/help/host-your-own-signup-forms/")`,
        defaultValue: "http://eepurl.com/ic43yL",
        helpText:
          "You can learn how.(https://mailchimp.com/help/share-your-signup-form/)",
      },
    },
  };

export function MailchimpSignupForm({
  className,
  url,
}: MailchimpSignupFormProps) {
  if (!url) {
    return <div>Please specify URL</div>;
  }

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
