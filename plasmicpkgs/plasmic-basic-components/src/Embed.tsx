/** @format */

import registerComponent from "@plasmicapp/host/registerComponent";
import React, { useEffect, useRef } from "react";
import { ensure } from "./common";

export interface EmbedProps {
  className?: string;
  code: string;
  hideInEditor?: boolean;
}

export default function Embed({
  className,
  code,
  hideInEditor = false,
}: EmbedProps) {
  const rootElt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hideInEditor) {
      return;
    }
    Array.from(ensure(rootElt.current).querySelectorAll("script")).forEach(
      (oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        ensure(oldScript.parentNode).replaceChild(newScript, oldScript);
      }
    );
  }, [code, hideInEditor]);
  const effectiveCode = hideInEditor ? "" : code;
  return (
    <div
      ref={rootElt}
      className={className}
      dangerouslySetInnerHTML={{ __html: effectiveCode }}
    />
  );
}

registerComponent(Embed, {
  name: "Embed",
  importPath: "@plasmicpkgs/plasmic-basic-components/Embed",
  props: {
    code: {
      type: "string",
      defaultValue: "https://www.example.com",
    },
    hideInEditor: {
      type: "boolean",
      displayName: "Hide in editor",
      description:
        "Disable running the code while editing in Plasmic Studio (may require reload)",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    maxWidth: "100%",
  },
});
