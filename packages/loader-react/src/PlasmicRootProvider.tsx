import * as React from 'react';
import {
  ComponentRenderData,
  InternalPlasmicComponentLoader,
  PlasmicComponentLoader,
} from './loader';

interface PlasmicRootContextValue {
  globalVariants?: GlobalVariantSpec[];
  loader: InternalPlasmicComponentLoader;
}

const PlasmicRootContext = React.createContext<
  PlasmicRootContextValue | undefined
>(undefined);

export interface GlobalVariantSpec {
  name: string;
  projectId?: string;
  value: any;
}

/**
 * PlasmicRootProvider should be used at the root of your page
 * or application.
 */
export function PlasmicRootProvider(props: {
  /**
   * If you have pre-fetched component data via PlasmicComponentLoader,
   * you can pass them in here; PlasmicLoader will avoid fetching
   * component data that have already been pre-fetched.
   */
  prefetchedData?: ComponentRenderData;

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
}) {
  const { globalVariants, prefetchedData, children } = props;
  const loader = (props.loader as any)
    .__internal as InternalPlasmicComponentLoader;

  if (prefetchedData) {
    loader.registerPrefetchedBundle(prefetchedData?.bundle);
  }
  const value = React.useMemo<PlasmicRootContextValue>(
    () => ({
      globalVariants,
      loader,
    }),
    [globalVariants, loader]
  );

  return (
    <PlasmicRootContext.Provider value={value}>
      <PlasmicCss loader={loader} />
      {children}
    </PlasmicRootContext.Provider>
  );
}

/**
 * Inject all css modules as <style/> tags. We can't use the usual styleInjector postcss
 * uses because that doesn't work on the server side for SSR.
 */
function PlasmicCss(props: { loader: InternalPlasmicComponentLoader }) {
  const { loader } = props;
  const [css, setCss] = React.useState(buildCss(loader));

  const watcher = React.useMemo(
    () => ({
      onDataFetched: () => setCss(buildCss(loader)),
    }),
    [loader]
  );
  React.useEffect(() => {
    loader.subscribePlasmicRoot(watcher);
    return () => loader.unsubscribePlasmicRoot(watcher);
  }, [watcher, loader]);

  // We always render the style tag, even when data is not yet ready, to avoid
  // mutating the React tree and invalidating the children when the data does come in
  return (
    <style
      key="plasmic-css"
      dangerouslySetInnerHTML={{ __html: css }}
      suppressHydrationWarning
    />
  );
}

function buildCss(loader: InternalPlasmicComponentLoader) {
  const cssModules = loader.getLookup().getCss();
  const remoteFonts = loader.getLookup().getRemoteFonts();

  // Make sure the @import statements come at the front of css
  return `
    ${remoteFonts.map((f) => `@import url('${f.url}');`).join('\n')}
    ${cssModules.map((mod) => mod.source).join('\n')}
  `;
}

export function usePlasmicRootContext() {
  return React.useContext(PlasmicRootContext);
}
