import {
  InitOptions,
  initPlasmicLoader as initPlasmicLoaderReact,
} from "@plasmicapp/loader-react";
import * as Gatsby from "gatsby";
import * as React from "react";
import * as ReactDom from "react-dom";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as jsxRuntime from "react/jsx-runtime";

export function initPlasmicLoader(opts: InitOptions) {
  const loader = initPlasmicLoaderReact({
    onClientSideFetch: "warn",
    ...opts,
    platform: "gatsby",
  });

  loader.registerModules({
    react: React,
    "react-dom": ReactDom,
    gatsby: Gatsby,
    "react/jsx-runtime": jsxRuntime,
    "react/jsx-dev-runtime": jsxDevRuntime,
  });

  return loader;
}
