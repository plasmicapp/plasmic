import {
  CodeComponentMeta,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from './loader';
import type { InitOptions } from './loader-react-server';

export {
  DataCtxReader,
  DataProvider,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PrimitiveType,
  PropType,
  repeatedElement,
  TokenRegistration,
  useDataEnv,
  usePlasmicCanvasContext,
  useSelector,
  useSelectors,
} from '@plasmicapp/host';
export { usePlasmicQueryData } from '@plasmicapp/query';
export * from './index-shared';
export { PlasmicComponent } from './PlasmicComponent';
export {
  GlobalVariantSpec,
  PlasmicRootProvider,
  PlasmicTranslator,
} from './PlasmicRootProvider';
export { extractPlasmicQueryData, plasmicPrepass } from './prepass';
export {
  extractPlasmicQueryDataFromElement,
  hydrateFromElement,
  renderToElement,
  renderToString,
} from './render';
export { usePlasmicComponent } from './usePlasmicComponent';
export {
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
  CodeComponentMeta,
};

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPlasmicComponentLoader(opts);
  return new PlasmicComponentLoader(internal);
}
