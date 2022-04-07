import { AssetModule, ComponentMeta, Split } from '@plasmicapp/loader-core';
import { PlasmicQueryDataProvider } from '@plasmicapp/query';
import * as React from 'react';
import {
  ComponentRenderData,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from './loader';
import { useForceUpdate } from './utils';
import {
  getGlobalVariantsFromSplits,
  mergeGlobalVariantsSpec,
} from './variation';

interface PlasmicRootContextValue {
  globalVariants?: GlobalVariantSpec[];
  globalContextsProps?: Record<string, any>;
  loader: InternalPlasmicComponentLoader;
  variation?: Record<string, string>;
  translator?: PlasmicTranslator;
}

const PlasmicRootContext =
  React.createContext<PlasmicRootContextValue | undefined>(undefined);

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
export function PlasmicRootProvider(props: {
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
}) {
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
  } = props;
  const loader = (props.loader as any)
    .__internal as InternalPlasmicComponentLoader;

  if (prefetchedData) {
    loader.registerPrefetchedBundle(prefetchedData?.bundle);
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

  const value = React.useMemo<PlasmicRootContextValue>(
    () => ({
      globalVariants: mergeGlobalVariantsSpec(
        globalVariants ?? [],
        getGlobalVariantsFromSplits(splits, variation ?? {})
      ),
      globalContextsProps,
      loader,
      variation,
      translator,
    }),
    [globalVariants, variation, globalContextsProps, loader, splits, translator]
  );

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
        {children}
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
      'entrypoint.css',
      ...scopedCompMetas.map((c) => c.cssFile),
    ]);
  const cssModules = loader
    .getLookup()
    .getCss()
    .filter((f) => !cssFiles || cssFiles.has(f.fileName));

  const getPri = (fileName: string) => (fileName === 'entrypoint.css' ? 0 : 1);
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
        ? ''
        : remoteFonts.map((f) => `@import url('${f.url}');`).join('\n')
    }
    ${cssModules.map((mod) => mod.source).join('\n')}
  `;
}

export function usePlasmicRootContext() {
  return React.useContext(PlasmicRootContext);
}
