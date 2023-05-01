import 'server-only';

import {
  InitOptions,
  initPlasmicLoader as initPlasmicLoaderReact,
  ReactServerPlasmicComponentLoader,
} from '@plasmicapp/loader-react/react-server';
import { initPlasmicLoaderWithCache } from './cache';

export * from './shared-exports';

export function initPlasmicLoader(opts: InitOptions) {
  return initPlasmicLoaderWithCache<ReactServerPlasmicComponentLoader>(
    initPlasmicLoaderReact,
    opts
  );
}
