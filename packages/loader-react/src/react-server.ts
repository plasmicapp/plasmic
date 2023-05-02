import "server-only";

import { PlasmicModulesFetcher, PlasmicTracker } from "@plasmicapp/loader-core";
import {
  InitOptions,
  ReactServerPlasmicComponentLoader,
} from "./loader-react-server";

export * from "./shared-exports";
export { ReactServerPlasmicComponentLoader };

export function initPlasmicLoader(
  opts: InitOptions
): ReactServerPlasmicComponentLoader {
  return new ReactServerPlasmicComponentLoader({
    opts,
    fetcher: new PlasmicModulesFetcher(opts),
    tracker: new PlasmicTracker({
      projectIds: opts.projects.map((p) => p.id),
      platform: opts.platform,
      preview: opts.preview,
    }),
  });
}
