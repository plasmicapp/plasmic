import { initPlasmicLoader as initPlasmicLoaderReact } from '@plasmicapp/loader-react';
import type { PlasmicRemoteChangeWatcher as Watcher } from '@plasmicapp/watcher';
import * as NextHead from 'next/head';
import * as NextLink from 'next/link';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import { makeCache } from './cache';
import serverRequire from './server-require';
export {
  ComponentMeta,
  ComponentRenderData,
  InitOptions,
  PageMeta,
  PageMetadata,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PlasmicComponent,
  PlasmicRootProvider,
  PrimitiveType,
  PropType,
  repeatedElement,
  usePlasmicComponent,
} from '@plasmicapp/loader-react';

export function initPlasmicLoader(
  opts: Parameters<typeof initPlasmicLoaderReact>[0]
) {
  const isBrowser = typeof window !== 'undefined';
  const isProd = process.env.NODE_ENV === 'production';
  const cache = isBrowser || isProd ? undefined : makeCache(opts);
  const loader = initPlasmicLoaderReact({
    onClientSideFetch: 'warn',
    ...opts,
    cache,
    platform: 'nextjs',
    // For Nextjs 12, revalidate may in fact re-use an existing instance
    // of PlasmicComponentLoader that's already in memory, so we need to
    // make sure we don't re-use the data cached in memory.
    alwaysFresh: isProd && !isBrowser,
  });
  loader.registerModules({
    react: React,
    'react-dom': ReactDOM,
    'next/head': NextHead,
    'next/link': NextLink,
    'react/jsx-runtime': jsxRuntime,
    'react/jsx-dev-runtime': jsxDevRuntime,
  });

  if (cache) {
    if (!isProd) {
      console.log(`Subscribing to Plasmic changes...`);

      // Import using serverRequire, so webpack doesn't bundle us into client bundle
      const PlasmicRemoteChangeWatcher = serverRequire('@plasmicapp/watcher')
        .PlasmicRemoteChangeWatcher as typeof Watcher;
      const watcher = new PlasmicRemoteChangeWatcher({
        projects: opts.projects,
        host: opts.host,
      });

      const clearCache = (projectId: string) => {
        console.log(
          `Detected update to ${projectId}; clearing cache: ${new Date().toISOString()}`
        );
        cache.clear();
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
    } else {
      cache.clear();
      loader.clearCache();
    }
  }
  return loader;
}
