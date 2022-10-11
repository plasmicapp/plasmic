import React from 'react';
import ReactDOM from 'react-dom';
import { renderToString as reactRenderToString } from 'react-dom/server';
import { ComponentRenderData, PlasmicComponentLoader } from './loader';
import { PlasmicComponent } from './PlasmicComponent';
import { GlobalVariantSpec, PlasmicRootProvider } from './PlasmicRootProvider';
import { extractPlasmicQueryData } from './prepass';
import { ComponentLookupSpec } from './utils';

export async function renderToElement(
  loader: PlasmicComponentLoader,
  target: HTMLElement,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
    prefetchedQueryData?: Record<string, any>;
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
    prefetchedQueryData?: Record<string, any>;
  } = {}
) {
  const element = makeElement(loader, lookup, opts);
  return reactRenderToString(element);
}

export async function extractPlasmicQueryDataFromElement(
  loader: PlasmicComponentLoader,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
    prefetchedQueryData?: Record<string, any>;
  } = {}
) {
  const element = makeElement(loader, lookup, opts);
  return extractPlasmicQueryData(element);
}

export async function hydrateFromElement(
  loader: PlasmicComponentLoader,
  target: HTMLElement,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
    prefetchedQueryData?: Record<string, any>;
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
    prefetchedQueryData?: Record<string, any>;
  } = {}
) {
  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={opts.prefetchedData}
      globalVariants={opts.globalVariants}
      prefetchedQueryData={opts.prefetchedQueryData}
    >
      <PlasmicComponent
        component={typeof lookup === 'string' ? lookup : lookup.name}
        projectId={typeof lookup === 'string' ? undefined : lookup.projectId}
        componentProps={opts.componentProps}
      />
    </PlasmicRootProvider>
  );
}
