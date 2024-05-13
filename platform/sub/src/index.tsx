// organize-imports-ignore
import { PlasmicCanvasHost } from "@plasmicapp/host";

import * as React from "react";
import { createRoot } from "react-dom/client";

export function renderHostScaffold() {
  const appRoot = document.querySelector(".app-root");
  if (appRoot) {
    const root = createRoot(appRoot);
    return root.render(<PlasmicCanvasHost />);
  }
}

if (location.pathname === "/static/host.html") {
  renderHostScaffold();
}
