import { PlasmicRemoteChangeWatcher } from '@plasmicapp/loader-core';
import { initPlasmicLoader as initPlasmicLoaderReact } from '@plasmicapp/loader-react';
import * as NextHead from 'next/head';
import * as NextLink from 'next/link';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { makeCache } from './cache';
export {
  ComponentRenderData,
  PlasmicLoader,
  PlasmicRootProvider,
  usePlasmicComponent,
} from '@plasmicapp/loader-react';

export function initPlasmicLoader(
  opts: Parameters<typeof initPlasmicLoaderReact>[0]
) {
  const isBrowser = typeof window !== 'undefined';
  const cache = isBrowser ? undefined : makeCache(opts);
  const loader = initPlasmicLoaderReact({
    ...opts,
    cache,
  });
  loader.registerModules({
    react: React,
    'react-dom': ReactDOM,
    'next/head': NextHead,
    'next/link': NextLink,
  });

  if (cache && opts.preview) {
    const watcher = new PlasmicRemoteChangeWatcher({
      projects: opts.projects,
      host: opts.host,
    });
    watcher.subscribe({
      onChange: async (projectId: string) => {
        console.log(
          `Detected update to ${projectId}: ${new Date().toISOString()}`
        );
        await cache.clear();
        loader.clearCache();
      },
    });
  }
  return loader;
}
