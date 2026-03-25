import "server-only";

import { InternalPrepassPlasmicLoader } from "./loader-server";
import { InitOptions, PlasmicComponentLoader } from "./loader-shared";

export * from "./shared-exports";
export {
  InternalPrepassPlasmicLoader as InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
};

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPrepassPlasmicLoader(opts);
  return new PlasmicComponentLoader(internal);
}
