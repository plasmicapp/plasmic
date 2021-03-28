// tslint:disable:ordered-imports
// organize-imports-ignore
import "./preamble";

import * as ReactWeb from "@plasmicapp/react-web";
import * as mobx from "mobx";
import * as mobxReactLite from "mobx-react-lite";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as slate from "slate";
import * as slateReact from "slate-react";
import ResizeObserver from "resize-observer-polyfill";
import { globalHookCtx } from "./globalHook";
import { ensure } from "./lang-utils";
const root = require("window-or-global");

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
  component: React.ComponentType;
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
  component: React.ComponentType<any>,
  meta: ComponentMeta
) {
  self.__PlasmicComponentRegistry.push({ component, meta });
}

const plasmicRootNode: mobx.IObservableValue<React.ReactElement | null> = mobx.observable.box(null, {deep: false});

root.__Sub = {
  React,
  ReactDOM,
  ReactWeb,
  ResizeObserver,
  mobx,
  mobxReactLite,
  slate,
  slateReact,
  localObject: Object,
  localElement: Element,
  globalHookCtx,
  setPlasmicRootNode: (node: React.ReactElement | null) => plasmicRootNode.set(node),
}

export function renderStudioIntoIframe() {
  const script = document.createElement("script");
  const params = new URL(`https://fakeurl/${location.hash.replace(/#/, "?")}`)
    .searchParams;
  const plasmicOrigin = ensure(params.get("origin"));
  script.src = plasmicOrigin + "/static/js/studio.js";
  document.body.appendChild(script);
}

export const PlasmicCanvasHost = mobxReactLite.observer(function PlasmicCanvasHost() {
  const shouldRenderStudio = !document.querySelector("#plasmic-studio-tag") &&
  !location.hash.match(/\bcanvas=true\b/) &&
  !location.hash.match(/\blive=true\b/);
  React.useEffect(() => {
    if (shouldRenderStudio) {
      renderStudioIntoIframe();
    }
  }, [shouldRenderStudio]);
  if (shouldRenderStudio) {
    return null;
  }
  return <div id="app" className="__wab_user-body">{plasmicRootNode.get()}</div>;
});