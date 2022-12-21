import 'server-only';

import {
  InitOptions,
  initPlasmicLoader as initPlasmicLoaderReact,
  ReactServerPlasmicComponentLoader,
} from '@plasmicapp/loader-react/react-server';
import { initPlasmicLoaderWithCache } from './cache';

export * from './index-shared';

export function initPlasmicLoader(opts: InitOptions) {
  return initPlasmicLoaderWithCache<ReactServerPlasmicComponentLoader>(
    initPlasmicLoaderReact,
    opts
  );
}
