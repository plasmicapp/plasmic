import "server-only";

import {
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react/react-server";
import type { IncomingMessage, ServerResponse } from "http";
import NextHead from "next/head.js";
import NextLink from "next/link.js";
import * as NextRouter from "next/router.js";
import { initPlasmicLoaderWithCache } from "./cache";
import type { NextInitOptions } from "./shared-exports";

import { __EXPERMIENTAL__extractPlasmicQueryData as internalExtractPlasmicQueryData } from "@plasmicapp/loader-react/react-server";
import { ExtractPlasmicQueryData } from "@plasmicapp/nextjs-app-router";
import { fetchExtractedQueryData } from "@plasmicapp/nextjs-app-router/react-server";

export * from "./shared-exports";
export { fetchExtractedQueryData as __EXPERMIENTAL__fetchExtractedQueryData };

import React from "react";
import type * as ClientExports from ".";

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

export function initPlasmicLoader(opts: NextInitOptions) {
  const loader = initPlasmicLoaderWithCache<NextJsPlasmicComponentLoader>(
    (opts) =>
      new PlasmicComponentLoader(new InternalPlasmicComponentLoader(opts)),
    opts
  );
  loader.registerModules({
    "next/head": NextHead,
    "next/link": NextLink,
    "next/router": NextRouter,
  });
  if (opts.nextNavigation) {
    loader.registerModules({
      "next/navigation": opts.nextNavigation,
    });
  }
  return loader;
}

export const __EXPERMIENTAL__extractPlasmicQueryData: (
  element: React.ReactElement,
  // We can't use `NextJsPlasmicComponentLoader` or `PlasmicComponentLoader`
  // types because they refer to the react-server version, which Typescript
  // doesn't recognize as compatible with the client version (whose type is
  // also the one exported from `react-server-conditional` imports).
  loader: ClientExports.NextJsPlasmicComponentLoader
) => Promise<Record<string, any>> = internalExtractPlasmicQueryData as any;

/**
 * Helper function to extract Plasmic data.
 *
 * Given the <PlasmicClientRootProvider> element and current pathname + search
 * params, returns:
 * - The extracted query data, if `plasmicSsr` search param is set
 * - A copy of the root provider element with the extracted query data, otherwise
 */
export async function __EXPERMIENTAL__withExtractPlasmicQueryData(
  plasmicRootProvider: React.ReactElement,
  {
    pathname,
    searchParams,
  }: {
    pathname: string;
    searchParams: Record<string, string | string[]> | undefined;
  }
) {
  const isPlasmicSsr =
    !!searchParams?.["plasmicSsr"] && searchParams?.["plasmicSsr"] !== "false";

  // If `plasmicSsr` search param is set, just wrap the root provider inside
  // <ExtractPlasmicQueryData>
  if (isPlasmicSsr) {
    return (
      <ExtractPlasmicQueryData>{plasmicRootProvider}</ExtractPlasmicQueryData>
    );
  }

  // Otherwise, fetch the same endpoint, but setting `plasmicSsr` to extract the
  // query data.
  const prepassHost =
    process.env.PLASMIC_PREPASS_HOST ??
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
    `http://localhost:${process.env.PORT ?? 3000}`;

  // Build a copy of the search params
  const newSearchParams = new URLSearchParams(
    Object.entries(searchParams ?? {}).flatMap(([key, values]) =>
      Array.isArray(values) ? values.map((v) => [key, v]) : [[key, values]]
    )
  );

  // Set `plasmicSsr` search param to indicate you are using this endpoint
  // to extract query data.
  newSearchParams.set("plasmicSsr", "true");

  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    // If protection bypass is enabled, use it to ensure fetching from
    // the SSR endpoint will not return the authentication page HTML
    newSearchParams.set(
      "x-vercel-protection-bypass",
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    );
  }

  // Fetch the data from the endpoint using the new search params
  const prefetchedQueryData = await fetchExtractedQueryData(
    `${prepassHost}${pathname}?${newSearchParams.toString()}`
  );

  // Provide the query data to <PlasmicClientRootProvider>
  return React.cloneElement(plasmicRootProvider, {
    prefetchedQueryData,
  });
}
