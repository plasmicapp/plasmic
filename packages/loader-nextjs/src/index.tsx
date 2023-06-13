import {
  InitOptions,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
  PlasmicRootProvider as CommonPlasmicRootProvider,
} from "@plasmicapp/loader-react";
import { IncomingMessage, ServerResponse } from "http";
// NextHead and NextLink must be default imported (`import Pkg`) instead of a namespace import (`import * as Pkg`).
// Otherwise, there's a Next.js 12 bug when referencing these dependencies due to default import interop.
// The transpiled CommonJS code would create a `default` field on the package,
// causing React to think it's an invalid React object:
// ```
// const NextHead = __defaultInterop(require('next/head.js'))
// assert(typeof NextHead === 'object')
// assert(typeof NextHead.default === 'function')
// ```
import NextHead from "next/head.js";
import NextLink from "next/link.js";
import * as NextRouter from "next/router.js";
import * as React from "react";
import { initPlasmicLoaderWithCache } from "./cache";

export {
  DataCtxReader,
  DataProvider,
  extractPlasmicQueryData,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PlasmicComponent,
  plasmicPrepass,
  repeatedElement,
  useDataEnv,
  usePlasmicCanvasContext,
  usePlasmicComponent,
  usePlasmicQueryData,
  useSelector,
  useSelectors,
} from "@plasmicapp/loader-react";
export type {
  CodeComponentMeta,
  PlasmicTranslator,
  PropType,
  TokenRegistration,
} from "@plasmicapp/loader-react";
export * from "./shared-exports";

type ServerRequest = IncomingMessage & {
  cookies: {
    [key: string]: string;
  };
};
export class NextJsPlasmicComponentLoader extends PlasmicComponentLoader {
  constructor(internal: InternalPlasmicComponentLoader) {
    super(internal);
    this.registerModules({
      "next/head": NextHead,
      "next/link": NextLink,
      "next/router": NextRouter,
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

const PlasmicNextLink = React.forwardRef(function PlasmicNextLink(
  props: React.ComponentProps<typeof NextLink>,
  ref: React.Ref<HTMLAnchorElement>
) {
  // Basically renders NextLink, except when href is undefined,
  // which freaks out NextLink :-/
  if (props.href) {
    const {
      href,
      replace,
      scroll,
      shallow,
      passHref,
      prefetch,
      locale,
      ...rest
    } = props;
    // We use legacyBehavior, because we don't know which
    // version of next the user has installed
    return (
      <NextLink
        href={href}
        replace={replace}
        scroll={scroll}
        shallow={shallow}
        passHref={passHref}
        prefetch={prefetch}
        locale={locale}
        {...({ legacyBehavior: true } as any)}
      >
        <a {...rest} ref={ref} />
      </NextLink>
    );
  } else {
    return <a {...props} href={undefined} ref={ref} />;
  }
});

export function PlasmicRootProvider(
  // We omit Head but still allow override for Link
  props: Omit<React.ComponentProps<typeof CommonPlasmicRootProvider>, "Head">
) {
  return (
    <CommonPlasmicRootProvider
      Head={NextHead}
      Link={PlasmicNextLink}
      {...props}
    />
  );
}
