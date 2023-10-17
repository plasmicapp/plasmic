import "server-only";

import {
  initPlasmicLoader as initPlasmicLoaderReact,
  ReactServerPlasmicComponentLoader,
} from "@plasmicapp/loader-react/react-server";
import { initPlasmicLoaderWithCache } from "./cache";
import type { NextInitOptions } from "./shared-exports";

export * from "./shared-exports";

export function initPlasmicLoader(opts: NextInitOptions) {
  return initPlasmicLoaderWithCache<ReactServerPlasmicComponentLoader>(
    initPlasmicLoaderReact,
    opts
  );
}
