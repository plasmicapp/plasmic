import {
  InitOptions,
  initPlasmicLoader as initPlasmicLoaderReact,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from '@plasmicapp/loader-react';
import type { PlasmicRemoteChangeWatcher as Watcher } from '@plasmicapp/watcher';
import { IncomingMessage, ServerResponse } from 'http';
import * as NextHead from 'next/head';
import * as NextLink from 'next/link';
import * as NextRouter from 'next/router';
import { makeCache } from './cache';
import serverRequire from './server-require';
export {
  ComponentMeta,
  ComponentRenderData,
  // Data context helpers.
  DataCtxReader,
  DataProvider,
  extractPlasmicQueryData,
  InitOptions,
  PageMeta,
  PageMetadata,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PlasmicComponent,
  plasmicPrepass,
  PlasmicRootProvider,
  PlasmicTranslator,
  PrimitiveType,
  PropType,
  repeatedElement,
  useDataEnv,
  usePlasmicCanvasContext,
  usePlasmicComponent,
  usePlasmicQueryData,
  useSelector,
  useSelectors,
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
    traits: Record<string, string | number | boolean>;
  }) {
    const extractBuiltinTraits = () => {
      const url = new URL(
        opts.req?.url ?? '/',
        `https://${opts.req?.headers.host ?? 'server.side'}`
      );
      return {
        pageUrl: url.href,
      };
    };

    return this._getActiveVariation({
      traits: {
        ...extractBuiltinTraits(),
        ...opts.traits,
      },
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
    'next/head': NextHead,
    'next/link': NextLink,
    'next/router': NextRouter,
  });

  if (!isProd) {
    const stringOpts = JSON.stringify(opts);

    if (process.env.PLASMIC_OPTS && process.env.PLASMIC_OPTS !== stringOpts) {
      throw new Error(
        `We detected that your Plasmic configuration has changed. Please restart your dev server.\n`
      );
    }

    process.env.PLASMIC_OPTS = stringOpts;
  }

  if (cache) {
    if (!isProd) {
      if (process.env.PLASMIC_WATCHED !== 'true') {
        process.env.PLASMIC_WATCHED = 'true';
        console.log(`Subscribing to Plasmic changes...`);

        // Import using serverRequire, so webpack doesn't bundle us into client bundle
        const PlasmicRemoteChangeWatcher = serverRequire('@plasmicapp/watcher')
          .PlasmicRemoteChangeWatcher as typeof Watcher;
        const watcher = new PlasmicRemoteChangeWatcher({
          projects: opts.projects,
          host: opts.host,
        });

        const clearCache = () => {
          cache.clear();
          loader.clearCache();
        };

        watcher.subscribe({
          onUpdate: () => {
            if (opts.preview) {
              clearCache();
            }
          },
          onPublish: () => {
            if (!opts.preview) {
              clearCache();
            }
          },
        });
      }
    } else {
      cache.clear();
      loader.clearCache();
    }
  }
  return loader;
}
