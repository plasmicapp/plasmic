import type { CodeModule } from "@plasmicapp/loader-core";
import {
  PlasmicRootProvider as CommonPlasmicRootProvider,
  ComponentLookupSpec,
  FetchComponentDataOpts as InternalFetchComponentDataOpts,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
  extractPlasmicQueryData as internalExtractPlasmicQueryData,
} from "@plasmicapp/loader-react";
import { IncomingMessage, ServerResponse } from "http";
export {
  DataCtxReader,
  DataProvider,
  GlobalActionsContext,
  GlobalActionsProvider,
  PageParamsProvider,
  PlasmicCanvasContext,
  PlasmicCanvasHost,
  PlasmicComponent,
  PlasmicTranslatorContext,
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
export { ExtractPlasmicQueryData as __EXPERMIENTAL__ExtractPlasmicQueryData } from "@plasmicapp/nextjs-app-router";
export * from "./shared-exports";
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
import Script from "next/script";
import * as React from "react";
import { initPlasmicLoaderWithCache } from "./cache";
import { wrapRouterContext } from "./mocks";
import type { ComponentRenderData, NextInitOptions } from "./shared-exports";

type ServerRequest = IncomingMessage & {
  cookies: {
    [key: string]: string;
  };
};

const reactMajorVersion = +React.version.split(".")[0];

function filterCodeFromRenderData(data: ComponentRenderData) {
  if (reactMajorVersion >= 18 && !!data.bundle.bundleKey) {
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

export interface FetchComponentDataOpts extends InternalFetchComponentDataOpts {
  /**
   * Defer loading code chunks to script tags, reducing initial payload size.
   */
  deferChunks?: boolean;
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
      enableUnseededExperiments: true,
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

  maybeFetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData | null>;
  maybeFetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData | null>;
  async maybeFetchComponentData(
    ...args: any[]
  ): Promise<ComponentRenderData | null> {
    const data = await super.maybeFetchComponentData(...args);
    const { opts } = parseFetchComponentDataArgs(...args);
    if (
      data &&
      (opts?.deferChunks ||
        (opts?.deferChunks === undefined && data.bundle.deferChunksByDefault))
    ) {
      filterCodeFromRenderData(data);
    }
    return data;
  }

  fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData>;
  fetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData>;
  async fetchComponentData(...args: any[]): Promise<ComponentRenderData> {
    const data = await super.fetchComponentData(...args);
    const { opts } = parseFetchComponentDataArgs(...args);
    if (
      opts?.deferChunks ||
      (opts?.deferChunks === undefined && data.bundle.deferChunksByDefault)
    ) {
      filterCodeFromRenderData(data);
    }
    return data;
  }
}

function parseFetchComponentDataArgs(
  specs: ComponentLookupSpec[],
  opts?: FetchComponentDataOpts
): { specs: ComponentLookupSpec[]; opts?: FetchComponentDataOpts };
function parseFetchComponentDataArgs(...specs: ComponentLookupSpec[]): {
  specs: ComponentLookupSpec[];
  opts?: FetchComponentDataOpts;
};
function parseFetchComponentDataArgs(...args: any[]) {
  let specs: ComponentLookupSpec[];
  let opts: FetchComponentDataOpts | undefined;
  if (Array.isArray(args[0])) {
    specs = args[0];
    opts = args[1];
  } else {
    specs = args;
    opts = undefined;
  }
  return { specs, opts };
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

/**
 * Performs a prepass over Plasmic content, kicking off the necessary
 * data fetches, and populating the fetched data into a cache.  This
 * cache can be passed as prefetchedQueryData into PlasmicRootProvider.
 *
 * To limit rendering errors that can occur when you do this, we recommend
 * that you pass in _only_ the PlasmicComponents that you are planning to use
 * as the argument.  For example:
 *
 *   const cache = await extractPlasmicQueryData(
 *     <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
 *       <PlasmicComponent component="Home" componentProps={{
 *         // Specify the component prop overrides you are planning to use
 *         // to render the page, as they may change what data is fetched.
 *         ...
 *       }} />
 *       <PlasmicComponent component="NavBar" componentProps={{
 *         ...
 *       }} />
 *       ...
 *     </PlasmicRootProvider>
 *   );
 *
 * If your PlasmicComponent will be wrapping components that require special
 * context set up, you should also wrap the element above with those context
 * providers.
 *
 * You should avoid passing in elements that are not related to Plasmic, as any
 * rendering errors from those elements during the prepass may result in data
 * not being populated in the cache.
 *
 * @param element a React element containing instances of PlasmicComponent.
 *   Will attempt to satisfy all data needs from usePlasmicDataQuery()
 *   in this element tree.
 * @returns an object mapping query key to fetched data
 */
export async function extractPlasmicQueryData(element: React.ReactElement) {
  return internalExtractPlasmicQueryData(await wrapRouterContext(element));
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

  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    // `next/script` seems to not be correctly added to `<head>` in the initial
    // HTML sometimes when using custom documents:
    // https://linear.app/plasmic/issue/PLA-10652

    // Make sure to create the promises in this case - the script to actually fetch
    // the chunks will be added once hydration is completed.
    if (!(globalThis as any).__PlasmicBundlePromises) {
      (globalThis as any).__PlasmicBundlePromises = {};
    }
    for (const { fileName } of missingModulesData) {
      if (!(globalThis as any).__PlasmicBundlePromises[fileName]) {
        (globalThis as any).__PlasmicBundlePromises[fileName] = new Promise(
          (resolve) => {
            (globalThis as any).__PlasmicBundlePromises[
              "__promise_resolve_" + fileName
            ] = resolve;
          }
        );
      }
    }
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
      <Script
        strategy="beforeInteractive"
        key={"load:" + missingModulesData.map((m) => m.fileName).join(";")}
        id={"load:" + missingModulesData.map((m) => m.fileName).join(";")}
        defer
        async
        src={loader.getChunksUrl(prefetchedData.bundle, missingModulesData)}
      />
    </>
  );
}
