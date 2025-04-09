import { PlainLink } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import * as React from "react";

export function HelpButton() {
  const appCtx = useAppCtx();
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
