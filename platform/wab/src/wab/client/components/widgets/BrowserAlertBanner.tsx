import React from "react";
import PlasmicAlertBanner from "./plasmic/PlasmicAlertBanner";

export function BrowserAlertBanner() {
  const isChrome = navigator.userAgent.indexOf("Chrome") >= 0;
  const [dismissed, setDismissed] = React.useState(false);
  if (isChrome || dismissed) {
    return null;
  }

  return (
    <PlasmicAlertBanner
      variants={{ state: "notChrome" }}
      dismissBtn={{
        onClick: () => setDismissed(true),
      }}
    />
  );
}
