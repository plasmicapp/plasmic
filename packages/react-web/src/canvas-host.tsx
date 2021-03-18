import React, { ComponentType, useEffect } from "react";

export interface ComponentMeta {
  name: string;
  props: { [prop: string]: "string" | "boolean" | "number" | "object" | "slot" };
  /**
   * Either the path to the component relative to `rootDir` or the npm
   * package name
   */
  importPath: string;
  /**
   * Whether it's a default export or named export
   */
  isDefaultExport?: boolean;
}

export interface Registration {
  component: ComponentType;
  meta: ComponentMeta;
}

declare global {
  interface Window {
    __PlasmicHostVersion: string;
    __PlasmicComponentRegistry: Registration[];
  }
}

self.__PlasmicHostVersion = "1";
self.__PlasmicComponentRegistry = [];
export function registerComponent(
  component: ComponentType<any>,
  meta: ComponentMeta
) {
  self.__PlasmicComponentRegistry.push({ component, meta });
}

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
