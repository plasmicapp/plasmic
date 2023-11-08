import * as React from "react";
import { hideHelp } from "../../app-ctx";
import { useAppCtx } from "../../contexts/AppContexts";
import { PlainLink } from "../widgets";

export function HelpButton() {
  const appCtx = useAppCtx();
  if (hideHelp(appCtx)) {
    return null;
  }
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
