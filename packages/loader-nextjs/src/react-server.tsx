import "server-only";

import {
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react/react-server";
import type { IncomingMessage, ServerResponse } from "http";
import NextHead from "next/head.js";
import NextLink from "next/link.js";
import * as NextNavigation from "next/navigation.js";
import * as NextRouter from "next/router.js";
import { initPlasmicLoaderWithCache } from "./cache";
import type { InitOptions } from "./shared-exports";

export * from "./shared-exports";

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
        opts.req?.url ?? "/",
        `https://${opts.req?.headers.host ?? "server.side"}`
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
          const resCookie = opts.res?.getHeader("Set-Cookie") ?? [];
          let newCookies: string[] = [];
          if (Array.isArray(resCookie)) {
            newCookies = [...resCookie, `plasmic:${key}=${value}`];
          } else {
            newCookies = [`${resCookie}`, cookie];
          }

          opts.res?.setHeader("Set-Cookie", newCookies);
        }
      },
    });
  }
}

export function initPlasmicLoader(
  opts: InitOptions
): NextJsPlasmicComponentLoader {
  const loader = initPlasmicLoaderWithCache<NextJsPlasmicComponentLoader>(
    (opts_) =>
      new PlasmicComponentLoader(new InternalPlasmicComponentLoader(opts_)),
    opts
  );
  loader.registerModules({
    "next/head": NextHead,
    "next/link": NextLink,
    "next/navigation": NextNavigation,
    "next/router": NextRouter,
  });
  return loader;
}
