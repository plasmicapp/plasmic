import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import { ComponentRenderData, PlasmicComponentLoader } from './loader';
import { PlasmicLoader } from './PlasmicLoader';
import { GlobalVariantSpec, PlasmicRootProvider } from './PlasmicRootProvider';
import { ComponentLookupSpec } from './utils';

export async function renderToElement(
  loader: PlasmicComponentLoader,
  target: HTMLElement,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
  } = {}
) {
  return new Promise<void>((resolve) => {
    const element = makeElement(loader, lookup, opts);
    ReactDOM.render(element, target, () => resolve());
  });
}

export function renderToString(
  loader: PlasmicComponentLoader,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
  } = {}
) {
  const element = makeElement(loader, lookup, opts);
  return ReactDOMServer.renderToString(element);
}

export async function hydrateFromElement(
  loader: PlasmicComponentLoader,
  target: HTMLElement,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
  } = {}
) {
  return new Promise<void>((resolve) => {
    const element = makeElement(loader, lookup, opts);
    ReactDOM.hydrate(element, target, () => resolve());
  });
}

function makeElement(
  loader: PlasmicComponentLoader,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
  } = {}
) {
  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={opts.prefetchedData}
      globalVariants={opts.globalVariants}
    >
      <PlasmicLoader
        component={typeof lookup === 'string' ? lookup : lookup.name}
        projectId={typeof lookup === 'string' ? undefined : lookup.projectId}
        componentProps={opts.componentProps}
      />
    </PlasmicRootProvider>
  );
}
