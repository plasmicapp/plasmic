import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";

import { Widget } from "@typeform/embed-react";
import React from "react";
export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-typeform";

interface TypeformProps {
  className?: string;
  formId?: string;
}

export const TypeformMeta: CodeComponentMeta<TypeformProps> = {
  name: "hostless-typeform",
  displayName: "Typeform",
  importName: "Typeform",
  importPath: modulePath,
  providesData: true,
  description: "Embed Typeform on your website",
  defaultStyles: {
    width: "600px",
    height: "700px",
  },
  props: {
    formId: {
      type: "string",
      displayName: "Form ID",
      description: "ID of your form in Typeform",
      defaultValue: "R2s5BM",
    },
  },
};

export function Typeform({ className, formId }: TypeformProps) {
  if (!formId) {
    return <div>Please specify a Form ID</div>;
  }

  return (
    <div className={className}>
      <Widget
        id={formId!}
        style={{ width: "100%", height: "100%" }}
        className={className}
      />
    </div>
  );
}
