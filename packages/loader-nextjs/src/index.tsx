import { initPlasmicLoader as initPlasmicLoaderReact } from '@plasmicapp/loader-react';
import type { PlasmicRemoteChangeWatcher as Watcher } from '@plasmicapp/watcher';
import * as NextHead from 'next/head';
import * as NextLink from 'next/link';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { makeCache } from './cache';
import serverRequire from './server-require';
export {
  ComponentRenderData,
  InitOptions,
  PlasmicComponent,
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
    platform: 'nextjs',
  });
  loader.registerModules({
    react: React,
    'react-dom': ReactDOM,
    'next/head': NextHead,
    'next/link': NextLink,
  });

  if (cache && process.env.NODE_ENV !== 'production') {
    console.log(`Subscribing to Plasmic changes...`);

    // Import using serverRequire, so webpack doesn't bundle us into client bundle
    const PlasmicRemoteChangeWatcher = serverRequire('@plasmicapp/watcher')
      .PlasmicRemoteChangeWatcher as typeof Watcher;
    const watcher = new PlasmicRemoteChangeWatcher({
      projects: opts.projects,
      host: opts.host,
    });

    const clearCache = async (projectId: string) => {
      console.log(
        `Detected update to ${projectId}; clearing cache: ${new Date().toISOString()}`
      );
      await cache.clear();
      loader.clearCache();
    };

    watcher.subscribe({
      onUpdate: (projectId) => {
        if (opts.preview) {
          clearCache(projectId);
        }
      },
      onPublish: (projectId) => {
        if (!opts.preview) {
          clearCache(projectId);
        }
      },
    });
  }
  return loader;
}
