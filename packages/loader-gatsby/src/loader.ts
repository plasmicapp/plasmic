import {
  InitOptions,
  initPlasmicLoader as initPlasmicLoaderReact,
} from "@plasmicapp/loader-react";
import * as Gatsby from "gatsby";

export function initPlasmicLoader(opts: InitOptions) {
  const loader = initPlasmicLoaderReact({
    onClientSideFetch: "warn",
    ...opts,
    platform: "gatsby",
  });

  loader.registerModules({
    gatsby: Gatsby,
  });

  return loader;
}
