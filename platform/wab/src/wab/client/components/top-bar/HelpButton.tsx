import { PlainLink } from "@/wab/client/components/widgets";
import * as React from "react";

export function HelpButton() {
  return (
    <PlainLink
      className={"help-btn"}
      href={"https://plasmic.app/learn"}
      target="_blank"
    >
      Help
    </PlainLink>
  );
}
