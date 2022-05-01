import {
  InitOptions,
  initPlasmicLoader as initPlasmicLoaderReact,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from '@plasmicapp/loader-react';
import * as PlasmicQuery from '@plasmicapp/query';
import type { PlasmicRemoteChangeWatcher as Watcher } from '@plasmicapp/watcher';
import { IncomingMessage, ServerResponse } from 'http';
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
  extractPlasmicQueryData,
  InitOptions,
  PageMeta,
  PageMetadata,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PlasmicComponent,
  plasmicPrepass,
  PlasmicRootProvider,
  PlasmicTranslator,
  PrimitiveType,
  PropType,
  repeatedElement,
  usePlasmicCanvasContext,
  usePlasmicComponent,
  usePlasmicQueryData,
} from '@plasmicapp/loader-react';

type ServerRequest = IncomingMessage & {
  cookies: {
    [key: string]: string;
  };
};
export class NextJsPlasmicComponentLoader extends PlasmicComponentLoader {
  constructor(internal: InternalPlasmicComponentLoader) {
    super(internal);
  }

  async getActiveVariation(opts: {
    req?: ServerRequest;
    res?: ServerResponse;
    known?: Record<string, string>;
    traits: Record<string, string>;
  }) {
    return this._getActiveVariation({
      traits: opts.traits,
      getKnownValue: (key: string) => {
        if (opts.known) {
          return opts.known[key];
        } else {
          return opts.req?.cookies[`plasmic:${key}`] ?? undefined;
        }
      },
      updateKnownValue: (key: string, value: string) => {
        if (opts.res) {
          const cookie = `plasmic:${key}=${value}`;
          const resCookie = opts.res?.getHeader('Set-Cookie') ?? [];
          let newCookies: string[] = [];
          if (Array.isArray(resCookie)) {
            newCookies = [...resCookie, `plasmic:${key}=${value}`];
          } else {
            newCookies = [`${resCookie}`, cookie];
          }

          opts.res?.setHeader('Set-Cookie', newCookies);
        }
      },
    });
  }
}

const initPlasmicLoaderNext = (opts: InitOptions) => {
  const internal = new InternalPlasmicComponentLoader(opts);
  return new NextJsPlasmicComponentLoader(internal);
};

export function initPlasmicLoader(
  opts: Parameters<typeof initPlasmicLoaderReact>[0]
) {
  const isBrowser = typeof window !== 'undefined';
  const isProd = process.env.NODE_ENV === 'production';
  const cache = isBrowser || isProd ? undefined : makeCache(opts);
  const loader = initPlasmicLoaderNext({
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

    // Also inject @plasmicapp/query at run time, so that the same
    // context is used here and in loader-downloaded code
    '@plasmicapp/query': PlasmicQuery,
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
