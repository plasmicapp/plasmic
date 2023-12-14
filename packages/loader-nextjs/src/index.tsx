import {
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
import type { CodeModule } from "@plasmicapp/loader-core";
import NextHead from "next/head.js";
import NextLink from "next/link.js";
import * as NextRouter from "next/router.js";
import Script from "next/script";
import * as React from "react";
import { initPlasmicLoaderWithCache } from "./cache";
import type { ComponentRenderData, NextInitOptions } from "./shared-exports";

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

const reactMajorVersion = +React.version.split(".")[0];

function filterCodeFromRenderData(data: ComponentRenderData) {
  if (reactMajorVersion >= 18 && !!data.bundle.bundleUrlQuery) {
    // Keep the entrypoints
    const entrypoints = new Set([
      ...data.entryCompMetas.map((compMeta) => compMeta.entry),
      "root-provider.js",
      ...data.bundle.projects
        .map((x) => x.globalContextsProviderFileName)
        .filter((x) => !!x),
      ...data.bundle.components
        .filter((c) => c.isGlobalContextProvider)
        .map((c) => c.entry),
      ...data.bundle.globalGroups.map((g) => g.contextFile),
    ]);

    data.bundle.modules.browser = data.bundle.modules.browser.map((module) => {
      if (module.type !== "code" || entrypoints.has(module.fileName)) {
        return module;
      }
      return { ...module, code: "" };
    });
  }
}

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

  __unstable_maybeFetchComponentMetadata: PlasmicComponentLoader["maybeFetchComponentData"] =
    async (...specs) => {
      const data = await this.maybeFetchComponentData(...specs);
      if (data) {
        filterCodeFromRenderData(data);
      }
      return data;
    };

  __unstable_fetchComponentMetadata: PlasmicComponentLoader["fetchComponentData"] =
    async (...specs) => {
      const data = await this.fetchComponentData(...specs);
      filterCodeFromRenderData(data);
      return data;
    };
}

export function initPlasmicLoader(opts: NextInitOptions) {
  const loader = initPlasmicLoaderWithCache<NextJsPlasmicComponentLoader>(
    (opts) =>
      new NextJsPlasmicComponentLoader(
        new InternalPlasmicComponentLoader(opts)
      ),
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
    // If this is a fragment identifier link, then we set
    // scroll={false} so that smooth scrolling works
    const isFragment = typeof href === "string" && href.startsWith("#");
    // We use legacyBehavior, because we don't know which
    // version of next the user has installed
    return (
      <NextLink
        href={href}
        replace={replace}
        scroll={scroll != null ? scroll : isFragment ? false : undefined}
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
  props: Omit<
    React.ComponentProps<typeof CommonPlasmicRootProvider>,
    "Head"
  > & { skipChunks?: boolean }
) {
  return (
    <>
      {!props.skipChunks &&
        renderDynamicPayloadScripts(props.loader, props.prefetchedData)}
      <CommonPlasmicRootProvider
        Head={NextHead}
        Link={PlasmicNextLink}
        {...props}
      />
    </>
  );
}

function renderDynamicPayloadScripts(
  loader: PlasmicComponentLoader,
  prefetchedData: ComponentRenderData | undefined
) {
  const missingModulesData =
    prefetchedData &&
    prefetchedData.bundle.modules.browser.filter(
      (module): module is CodeModule => module.type === "code" && !module.code
    );
  if (!missingModulesData || missingModulesData.length === 0) {
    return null;
  }
  return (
    <>
      <Script
        strategy="beforeInteractive"
        key={"init:" + missingModulesData.map((m) => m.fileName).join(";")}
        id={"init:" + missingModulesData.map((m) => m.fileName).join(";")}
        dangerouslySetInnerHTML={{
          __html: `
            if (!globalThis.__PlasmicBundlePromises) {
              globalThis.__PlasmicBundlePromises = {};
            }
            ${missingModulesData
              .map(
                (
                  module
                ) => `if (!globalThis.__PlasmicBundlePromises[${JSON.stringify(
                  module.fileName
                )}]) {
                  globalThis.__PlasmicBundlePromises[${JSON.stringify(
                    module.fileName
                  )}] = new Promise((resolve) => {
                    globalThis.__PlasmicBundlePromises[${JSON.stringify(
                      "__promise_resolve_" + module.fileName
                    )}] = resolve;
                  })
                }
              `
              )
              .join("\n")}`.trim(),
        }}
      ></Script>
      {missingModulesData.length > 0 && (
        <Script
          strategy="beforeInteractive"
          key={"load:" + missingModulesData.map((m) => m.fileName).join(";")}
          id={"load:" + missingModulesData.map((m) => m.fileName).join(";")}
          defer
          async
          src={loader.getChunksUrl(prefetchedData.bundle, missingModulesData)}
        />
      )}
    </>
  );
}
