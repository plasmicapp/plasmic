import {
  InitOptions,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
  PlasmicRootProvider as CommonPlasmicRootProvider,
} from '@plasmicapp/loader-react';
import { IncomingMessage, ServerResponse } from 'http';
import * as NextHead from 'next/head';
import * as NextLink from 'next/link';
import * as NextRouter from 'next/router';
import * as React from 'react';
import { initPlasmicLoaderWithCache } from './cache';

export {
  CodeComponentMeta,
  DataCtxReader,
  DataProvider,
  extractPlasmicQueryData,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PlasmicComponent,
  plasmicPrepass,
  PlasmicTranslator,
  PrimitiveType,
  PropType,
  repeatedElement,
  TokenRegistration,
  useDataEnv,
  usePlasmicCanvasContext,
  usePlasmicComponent,
  usePlasmicQueryData,
  useSelector,
  useSelectors,
} from '@plasmicapp/loader-react';
export * from './index-shared';

type ServerRequest = IncomingMessage & {
  cookies: {
    [key: string]: string;
  };
};
export class NextJsPlasmicComponentLoader extends PlasmicComponentLoader {
  constructor(internal: InternalPlasmicComponentLoader) {
    super(internal);
    this.registerModules({
      'next/head': NextHead,
      'next/link': NextLink,
      'next/router': NextRouter,
    });
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

export function initPlasmicLoader(opts: InitOptions) {
  return initPlasmicLoaderWithCache<NextJsPlasmicComponentLoader>(
    initPlasmicLoaderNext,
    opts
  );
}

export function PlasmicRootProvider(
  props: Omit<React.ComponentProps<typeof CommonPlasmicRootProvider>, 'Head'>
) {
  return <CommonPlasmicRootProvider Head={NextHead.default} {...props} />;
}
