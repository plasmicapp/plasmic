import {
  CodeComponentMeta,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from "./loader";
import type {
  FetchComponentDataOpts,
  InitOptions,
} from "./loader-react-server";

export {
  DataCtxReader,
  DataProvider,
  GlobalActionsContext,
  GlobalActionsProvider,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  repeatedElement,
  useDataEnv,
  usePlasmicCanvasContext,
  useSelector,
  useSelectors,
} from "@plasmicapp/host";
export type { PropType, TokenRegistration } from "@plasmicapp/host";
export { extractPlasmicQueryData, plasmicPrepass } from "@plasmicapp/prepass";
export { usePlasmicQueryData } from "@plasmicapp/query";
export { PlasmicComponent } from "./PlasmicComponent";
export { PlasmicRootProvider } from "./PlasmicRootProvider";
export type {
  GlobalVariantSpec,
  PlasmicTranslator,
} from "./PlasmicRootProvider";
export {
  extractPlasmicQueryDataFromElement,
  hydrateFromElement,
  renderToElement,
  renderToString,
} from "./render";
export * from "./shared-exports";
export { usePlasmicComponent } from "./usePlasmicComponent";
export type { ComponentLookupSpec } from "./utils";
export type { CodeComponentMeta };
export { FetchComponentDataOpts };
export { InternalPlasmicComponentLoader, PlasmicComponentLoader };

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPlasmicComponentLoader(opts);
  return new PlasmicComponentLoader(internal);
}
