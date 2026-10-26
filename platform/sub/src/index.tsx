import { PlasmicCanvasHost } from "@plasmicapp/host";
import * as React from "react";
import { createRoot } from "react-dom/client";

export function renderHostScaffold() {
  const appRoot = document.querySelector<HTMLElement>(".app-root");
  if (appRoot) {
    const root = createRoot(appRoot);
    const { studioOrigin, studioStaticUrl } = appRoot.dataset;
    return root.render(
      <PlasmicCanvasHost
        allowedStudioOrigins={studioOrigin ? [studioOrigin] : []}
        allowedStudioStaticBaseUrl={studioStaticUrl}
      />,
    );
  }
}

if (location.pathname === "/static/host.html") {
  renderHostScaffold();
}
