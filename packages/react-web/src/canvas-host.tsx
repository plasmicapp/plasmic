import React, { useEffect } from "react";

function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

export function renderStudioIntoIframe() {
  const script = document.createElement("script");
  const params = new URL(`https://fakeurl/${location.hash.replace(/#/, "?")}`)
    .searchParams;
  const plasmicOrigin = ensure(params.get("origin"));
  script.src = plasmicOrigin + "/static/js/studio.js";
  document.body.appendChild(script);
}

export function PlasmicCanvasHost() {
  useEffect(() => {
    if (
      !document.querySelector("#plasmic-studio-tag") &&
      !location.hash.match(/\bcanvas=true\b/)
    ) {
      renderStudioIntoIframe();
    }
  }, []);
  return <div className={"plasmic-canvas-host"}></div>;
}
