import { PlasmicDataSourceContextValue } from "@plasmicapp/data-sources-context";
import { PageParamsProvider } from "@plasmicapp/host";
import { AssetModule, ComponentMeta, Split } from "@plasmicapp/loader-core";
import { PlasmicQueryDataProvider } from "@plasmicapp/query";
import * as React from "react";
import { InternalPlasmicComponentLoader } from "./loader-client";
import { ComponentRenderData, PlasmicComponentLoader } from "./loader-shared";
import { MaybeWrap, useForceUpdate } from "./utils";
import {
  getGlobalVariantsFromSplits,
  mergeGlobalVariantsSpec,
} from "./variation";

export interface PlasmicRootContextValue extends PlasmicDataSourceContextValue {
  globalVariants?: GlobalVariantSpec[];
  styleTokenOverridesProjectId?: string;
  globalContextsProps?: Record<string, any>;
  loader: InternalPlasmicComponentLoader;
  variation?: Record<string, string>;
  translator?: PlasmicTranslator;
  Head?: React.ComponentType<any>;
  Link?: React.ComponentType<any>;
  disableLoadingBoundary?: boolean;
  suspenseFallback?: React.ReactNode;
}

const PlasmicRootContext = React.createContext<
  PlasmicRootContextValue | undefined
>(undefined);

export interface GlobalVariantSpec {
  name: string;
  projectId?: string;
  value: any;
}

export type PlasmicTranslator = (
  str: string,
  opts?: {
    components?: {
      [key: string]: React.ReactElement | React.ReactFragment;
    };
  }
) => React.ReactNode;

/**
 * PlasmicRootProvider should be used at the root of your page
 * or application.
 */
export function PlasmicRootProvider(
  props: {
    /**
     * The global PlasmicComponentLoader instance you created via
     * initPlasmicLoader().
     */
    loader: PlasmicComponentLoader;

    /**
     * Global variants to activate for Plasmic components
     */
    globalVariants?: GlobalVariantSpec[];

    children?: React.ReactNode;

    /**
     * If true, will skip rendering css
     */
    skipCss?: boolean;

    /**
     * If true, will skip installing fonts
     */
    skipFonts?: boolean;

    /**
     * If you have pre-fetched component data via PlasmicComponentLoader,
     * you can pass them in here; PlasmicComponent will avoid fetching
     * component data that have already been pre-fetched.
     */
    prefetchedData?: ComponentRenderData;

    /**
     * If you have pre-fetched data that are needed by usePlasmicQueryData(),
     * then pass in the pre-fetched cache here, mapping query key to fetched data.
     */
    prefetchedQueryData?: Record<string, any>;

    /**
     * Specifies whether usePlasmicQueryData() should be operating in suspense mode
     * (throwing promises).
     */
    suspenseForQueryData?: boolean;

    /**
     * Override your Global Contexts Provider props. This is a map from
     * globalContextComponentNameProps to object of props to use for that
     * component.
     */
    globalContextsProps?: Record<string, any>;

    /**
     * Specifies a mapping of split id to slice id that should be activated
     */
    variation?: Record<string, string>;

    /**
     * Translator function to be used for text blocks
     */
    translator?: PlasmicTranslator;

    /**
     * Head component to use in PlasmicHead component (e.g. Head from next/head
     * or Helmet from react-helmet).
     */
    Head?: React.ComponentType<any>;

    /**
     * Link component to use. Can be any component that takes in props passed
     * to an <a/> tag.
     */
    Link?: React.ComponentType<any>;

    /**
     * Page route without params substitution (e.g. /products/[slug]).
     */
    pageRoute?: string;

    /**
     * Page path parameters (e.g. {slug: "foo"} if page path is
     * /products/[slug] and URI is /products/foo).
     */
    pageParams?: Record<string, string | string[] | undefined>;

    /**
     * Page query parameters (e.g. {q: "foo"} if page path is
     * /some/path?q=foo).
     */
    pageQuery?: Record<string, string | string[] | undefined>;
    /**
     * Whether the internal Plasmic React.Suspense boundaries should be removed
     */
    disableLoadingBoundary?: boolean;
    /**
     * Whether the root React.Suspense boundary should be removed
     */
    disableRootLoadingBoundary?: boolean;
    /**
     * Fallback value for React.Suspense boundary
     */
    suspenseFallback?: React.ReactNode;

    /**
     * When Plasmic loads components from multiple projects, we must choose a style token overrides to use that will apply to all components under the root PlasmicComponent.
     *
     * If styleTokenOverridesProjectId is set, all PlasmicComponents and their subtrees will use the specified project's style token overrides.
     * If styleTokenOverridesProjectId it not set, each PlasmicComponent and its subtree will use the style token overrides of the root PlasmicComponent's project.
     */
    styleTokenOverridesProjectId?: string;
  } & PlasmicDataSourceContextValue
) {
  const {
    globalVariants,
    prefetchedData,
    children,
    skipCss,
    skipFonts,
    prefetchedQueryData,
    suspenseForQueryData,
    globalContextsProps,
    variation,
    translator,
    Head,
    Link,
    pageRoute,
    pageParams,
    pageQuery,
    suspenseFallback,
    disableLoadingBoundary,
    disableRootLoadingBoundary,
    styleTokenOverridesProjectId,
  } = props;
  const loader = (props.loader as any)
    .__internal as InternalPlasmicComponentLoader;

  if (prefetchedData) {
    loader.registerPrefetchedBundle(prefetchedData.bundle);
  }

  const [splits, setSplits] = React.useState<Split[]>(loader.getActiveSplits());
  const forceUpdate = useForceUpdate();
  const watcher = React.useMemo(
    () => ({
      onDataFetched: () => {
        setSplits(loader.getActiveSplits());
        forceUpdate();
      },
    }),
    [loader, forceUpdate]
  );

  React.useEffect(() => {
    loader.subscribePlasmicRoot(watcher);
    return () => loader.unsubscribePlasmicRoot(watcher);
  }, [watcher, loader]);

  const currentContextValue = React.useContext(PlasmicRootContext);

  const { user, userAuthToken, isUserLoading, authRedirectUri } = props;

  const value = React.useMemo<PlasmicRootContextValue>(() => {
    // Fallback to the value in `currentContextValue` if none is provided
    const withCurrentContextValueFallback = <
      K extends keyof PlasmicRootContextValue
    >(
      v: PlasmicRootContextValue[K],
      key: K
    ): PlasmicRootContextValue[K] => {
      return (v !== undefined ? v : currentContextValue?.[key])!;
    };
    return {
      globalVariants: [
        ...mergeGlobalVariantsSpec(
          globalVariants ?? [],
          getGlobalVariantsFromSplits(splits, variation ?? {})
        ),
        ...(currentContextValue?.globalVariants ?? []),
      ],
      globalContextsProps: {
        ...(currentContextValue?.globalContextsProps ?? {}),
        ...(globalContextsProps ?? {}),
      },
      loader: withCurrentContextValueFallback(loader, "loader"),
      variation: {
        ...(currentContextValue?.variation ?? {}),
        ...(variation ?? {}),
      },
      translator: withCurrentContextValueFallback(translator, "translator"),
      Head: withCurrentContextValueFallback(Head, "Head"),
      Link: withCurrentContextValueFallback(Link, "Link"),
      user: withCurrentContextValueFallback(user, "user"),
      userAuthToken: withCurrentContextValueFallback(
        userAuthToken,
        "userAuthToken"
      ),
      isUserLoading: withCurrentContextValueFallback(
        isUserLoading,
        "isUserLoading"
      ),
      authRedirectUri: withCurrentContextValueFallback(
        authRedirectUri,
        "authRedirectUri"
      ),
      suspenseFallback: withCurrentContextValueFallback(
        suspenseFallback,
        "suspenseFallback"
      ),
      disableLoadingBoundary: withCurrentContextValueFallback(
        disableLoadingBoundary,
        "disableLoadingBoundary"
      ),
      styleTokenOverridesProjectId,
    };
  }, [
    globalVariants,
    variation,
    globalContextsProps,
    loader,
    splits,
    translator,
    Head,
    Link,
    user,
    userAuthToken,
    isUserLoading,
    authRedirectUri,
    suspenseFallback,
    disableLoadingBoundary,
    styleTokenOverridesProjectId,
    currentContextValue,
  ]);

  React.useEffect(() => {
    loader.trackRender({
      renderCtx: {
        // We track the provider as a single entity
        rootComponentId: "provider",
        teamIds: loader.getTeamIds(),
        projectIds: loader.getProjectIds(),
      },
      variation: value.variation,
    });
  }, [loader, value]);

  const reactMajorVersion = +React.version.split(".")[0];

  const shouldDisableRootLoadingBoundary =
    disableRootLoadingBoundary ??
    loader.getBundle().disableRootLoadingBoundaryByDefault;

  return (
    <PlasmicQueryDataProvider
      prefetchedCache={prefetchedQueryData}
      suspense={suspenseForQueryData}
    >
      <PlasmicRootContext.Provider value={value}>
        {!skipCss && (
          <PlasmicCss
            loader={loader}
            prefetchedData={prefetchedData}
            skipFonts={skipFonts}
          />
        )}
        <PageParamsProvider
          route={pageRoute}
          params={pageParams}
          query={pageQuery}
        >
          <MaybeWrap
            cond={!shouldDisableRootLoadingBoundary && reactMajorVersion >= 18}
            wrapper={(contents) => (
              <React.Suspense fallback={suspenseFallback ?? "Loading..."}>
                {contents}
              </React.Suspense>
            )}
          >
            {children}
          </MaybeWrap>
        </PageParamsProvider>
      </PlasmicRootContext.Provider>
    </PlasmicQueryDataProvider>
  );
}

/**
 * Inject all css modules as <style/> tags. We can't use the usual styleInjector postcss
 * uses because that doesn't work on the server side for SSR.
 */
const PlasmicCss = React.memo(function PlasmicCss(props: {
  loader: InternalPlasmicComponentLoader;
  prefetchedData?: ComponentRenderData;
  skipFonts?: boolean;
}) {
  const { loader, prefetchedData, skipFonts } = props;
  const [useScopedCss, setUseScopedCss] = React.useState(!!prefetchedData);
  const builtCss = buildCss(loader, {
    scopedCompMetas:
      useScopedCss && prefetchedData
        ? prefetchedData.bundle.components
        : undefined,
    skipFonts,
  });
  const forceUpdate = useForceUpdate();
  const watcher = React.useMemo(
    () => ({
      onDataFetched: () => {
        // If new data has been fetched, then use all the fetched css
        setUseScopedCss(false);
        forceUpdate();
      },
    }),
    [loader, forceUpdate]
  );

  React.useEffect(() => {
    loader.subscribePlasmicRoot(watcher);
    return () => loader.unsubscribePlasmicRoot(watcher);
  }, [watcher, loader]);

  return <style dangerouslySetInnerHTML={{ __html: builtCss }} />;
});

function buildCss(
  loader: InternalPlasmicComponentLoader,
  opts: {
    scopedCompMetas?: ComponentMeta[];
    skipFonts?: boolean;
  }
) {
  const { scopedCompMetas, skipFonts } = opts;
  const cssFiles =
    scopedCompMetas &&
    new Set<string>([
      "entrypoint.css",
      ...scopedCompMetas.map((c) => c.cssFile),
    ]);
  const cssModules = loader
    .getLookup()
    .getCss()
    .filter((f) => !cssFiles || cssFiles.has(f.fileName));

  const getPri = (fileName: string) => (fileName === "entrypoint.css" ? 0 : 1);
  const compareModules = (a: AssetModule, b: AssetModule) =>
    getPri(a.fileName) !== getPri(b.fileName)
      ? getPri(a.fileName) - getPri(b.fileName)
      : a.fileName.localeCompare(b.fileName);
  cssModules.sort(compareModules);

  const remoteFonts = loader.getLookup().getRemoteFonts();

  // Make sure the @import statements come at the front of css
  return `
    ${
      skipFonts
        ? ""
        : remoteFonts.map((f) => `@import url('${f.url}');`).join("\n")
    }
    ${cssModules.map((mod) => mod.source).join("\n")}
  `;
}

export function usePlasmicRootContext() {
  return React.useContext(PlasmicRootContext);
}
