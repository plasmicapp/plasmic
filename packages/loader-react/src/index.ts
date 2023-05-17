import {
  CodeComponentMeta,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from "./loader";
import type { InitOptions } from "./loader-react-server";

export type { PropType, TokenRegistration } from "@plasmicapp/host";
export {
  DataCtxReader,
  DataProvider,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  repeatedElement,
  useDataEnv,
  usePlasmicCanvasContext,
  useSelector,
  useSelectors,
} from "@plasmicapp/host";
export { usePlasmicQueryData } from "@plasmicapp/query";
export * from "./shared-exports";
export { PlasmicComponent } from "./PlasmicComponent";
export type {
  GlobalVariantSpec,
  PlasmicTranslator,
} from "./PlasmicRootProvider";
export { PlasmicRootProvider } from "./PlasmicRootProvider";
export { extractPlasmicQueryData, plasmicPrepass } from "./prepass";
export {
  extractPlasmicQueryDataFromElement,
  hydrateFromElement,
  renderToElement,
  renderToString,
} from "./render";
export { usePlasmicComponent } from "./usePlasmicComponent";
export type { CodeComponentMeta };
export { InternalPlasmicComponentLoader, PlasmicComponentLoader };

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPlasmicComponentLoader(opts);
  return new PlasmicComponentLoader(internal);
}
