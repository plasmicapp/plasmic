import { extractPlasmicQueryData } from "@plasmicapp/prepass";
import React from "react";
import ReactDOMClient from "react-dom/client";
import ReactDOMServer from "react-dom/server";
import { ComponentRenderData, PlasmicComponentLoader } from "./loader-shared";
import { PlasmicComponent } from "./PlasmicComponent";
import { GlobalVariantSpec, PlasmicRootProvider } from "./PlasmicRootProvider";
import { ComponentLookupSpec } from "./utils";

/**
 * Renders a Plasmic tree to a string.
 *
 * Uses React DOM server API `renderToString`, which is intended to be used for
 * server-rendered apps.
 */
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
  return ReactDOMServer.renderToString(element);
}

/**
 * Pre-renders a Plasmic tree to extract query data.
 *
 * This is intended to be used for server-rendered apps.
 */
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

/**
 * Renders a Plasmic tree in the target element.
 *
 * Uses React DOM client API `createRoot`, which is intended to be used from
 * client-rendered apps.
 */
export function renderToElement(
  loader: PlasmicComponentLoader,
  target: HTMLElement,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
    prefetchedQueryData?: Record<string, any>;
    pageParams?: Record<string, any>;
    pageQuery?: Record<string, any>;
  } = {}
) {
  const element = makeElement(loader, lookup, opts);
  const root = ReactDOMClient.createRoot(target);
  root.render(element);
  return root;
}

/**
 * Hydrates a Plasmic tree in the target element.
 *
 * Uses React DOM client API `hydrateRoot`, which is intended to be used from
 * server-rendered apps.
 */
export function hydrateFromElement(
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
  const element = makeElement(loader, lookup, opts);
  return ReactDOMClient.hydrateRoot(target, element);
}

function makeElement(
  loader: PlasmicComponentLoader,
  lookup: ComponentLookupSpec,
  opts: {
    prefetchedData?: ComponentRenderData;
    componentProps?: any;
    globalVariants?: GlobalVariantSpec[];
    prefetchedQueryData?: Record<string, any>;
    pageParams?: Record<string, any>;
    pageQuery?: Record<string, any>;
  } = {}
) {
  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={opts.prefetchedData}
      globalVariants={opts.globalVariants}
      prefetchedQueryData={opts.prefetchedQueryData}
      pageParams={opts.pageParams}
      pageQuery={opts.pageQuery}
    >
      <PlasmicComponent
        component={typeof lookup === "string" ? lookup : lookup.name}
        projectId={typeof lookup === "string" ? undefined : lookup.projectId}
        componentProps={opts.componentProps}
      />
    </PlasmicRootProvider>
  );
}
