import { InternalPlasmicComponentLoader } from "./loader-client";
import {
  CodeComponentMeta,
  FetchComponentDataOpts,
  InitOptions,
  PlasmicComponentLoader,
} from "./loader-shared";

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
export { usePlasmicQueryData } from "@plasmicapp/query";
export { PlasmicComponent } from "./PlasmicComponent";
export { PlasmicRootProvider } from "./PlasmicRootProvider";
export type {
  GlobalVariantSpec,
  PlasmicTranslator,
} from "./PlasmicRootProvider";
export { extractPlasmicQueryData, plasmicPrepass } from "./prepass-client";
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
export type { FetchComponentDataOpts };
export { InternalPlasmicComponentLoader, PlasmicComponentLoader };

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPlasmicComponentLoader(opts);
  return new PlasmicComponentLoader(internal);
}
