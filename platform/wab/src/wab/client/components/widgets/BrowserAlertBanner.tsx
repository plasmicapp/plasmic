import PlasmicAlertBanner from "@/wab/client/components/widgets/plasmic/PlasmicAlertBanner";
import React from "react";

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
