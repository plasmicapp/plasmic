import { DataCacheEntry, PrepassContext } from '@plasmicapp/query';
import React from 'react';
import { isFragment } from 'react-is';
import prepass from 'react-ssr-prepass';
import { PlasmicComponent } from './PlasmicComponent';

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
 export async function extractPlasmicQueryData(
  element: React.ReactElement
): Promise<Record<string, any>> {
  const cache: Record<string, DataCacheEntry<any>> = {};
  try {
    await plasmicPrepass(
      <PrepassContext.Provider value={{ cache }}>
        {element}
      </PrepassContext.Provider>
    );
  } catch (err) {
    console.warn(`PLASMIC: Error encountered while pre-rendering`, err);
  }
  return Object.fromEntries(
    Array.from(Object.entries(cache))
      .map(([key, { data }]) => [key, data])
      .filter(([key, data]) => !!data)
  );
}

/**
 * Runs react-ssr-prepass on `element`, while isolating rendering errors
 * as much as possible for each PlasmicComponent instance.
 */
export async function plasmicPrepass(element: React.ReactElement) {
  await prepass(buildPlasmicPrepassElement(element));
}

/**
 * Returns a clone of the element tree, where componentProps of PlasmicComponent
 * has been processed such that any React elements found are wrapped in
 * an error boundary. Makes it possible to isolate rendering errors while still
 * finishing as much data fetched as possible.
 */
function buildPlasmicPrepassElement(element: React.ReactElement) {
  return (
    <GenericErrorBoundary>{processReactElement(element)}</GenericErrorBoundary>
  );
}

function processReactElement(element: React.ReactElement) {
  if (element.type === PlasmicComponent) {
    return React.cloneElement(
      element,
      processPlasmicComponentProps(element.props)
    );
  } else {
    return React.cloneElement(element, processComponentProps(element.props));
  }
}

function processComponentProps(
  props: Record<string, any>
): Record<string, any> {
  if (!props || typeof props !== 'object') {
    return props;
  }

  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => {
      return [k, React.isValidElement(v) ? processReactElement(v) : v];
    })
  );
}

class GenericErrorBoundary extends React.Component<{
  children: React.ReactNode;
}> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  componentDidCatch(error: any) {
    console.log(`Plasmic: Encountered error while prepass rendering:`, error);
  }

  render() {
    return this.props.children;
  }
}

/**
 * To process the componentProps passed to PlasmicComponent, wrap any
 * React element we find in <GenericErrorBoundary />.
 */
function processPlasmicComponentProps(x: any): any {
  if (!x) {
    return x;
  } else if (isFragment(x)) {
    return (
      <React.Fragment>
        {React.Children.map(x.props.children, processPlasmicComponentProps)}
      </React.Fragment>
    );
  } else if (React.isValidElement(x)) {
    return <GenericErrorBoundary>{x}</GenericErrorBoundary>;
  } else if (Array.isArray(x)) {
    return x.map(processPlasmicComponentProps);
  } else if (isLiteralObject(x)) {
    return Object.fromEntries(
      Object.entries(x).map(([key, val]) => [
        key,
        processPlasmicComponentProps(val),
      ])
    );
  } else {
    return x;
  }
}

function isLiteralObject(obj: any): obj is Object {
  return !!obj && typeof obj === 'object' && obj.constructor === Object;
}
