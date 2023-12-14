import * as PlasmicDataSourcesContext from "@plasmicapp/data-sources-context";
// eslint-disable-next-line no-restricted-imports
import * as PlasmicHost from "@plasmicapp/host";
import {
  CodeComponentMeta as InternalCodeComponentMeta,
  ComponentHelpers as InternalCodeComponentHelpers,
  CustomFunctionMeta as InternalCustomFunctionMeta,
  GlobalContextMeta as InternalGlobalContextMeta,
  // eslint-disable-next-line no-restricted-imports
  registerComponent,
  registerFunction,
  registerGlobalContext,
  registerToken,
  registerTrait,
  StateHelpers,
  stateHelpersKeys,
  StateSpec,
  TokenRegistration,
  TraitMeta,
} from "@plasmicapp/host";
import {
  ComponentMeta,
  LoaderBundleOutput,
  PlasmicModulesFetcher,
  PlasmicTracker,
  Registry,
  TrackRenderOptions,
} from "@plasmicapp/loader-core";
import {
  CodeModule,
  internal_getCachedBundleInNodeServer,
} from "@plasmicapp/loader-fetcher";
import { getActiveVariation, getExternalIds } from "@plasmicapp/loader-splits";
import * as PlasmicQuery from "@plasmicapp/query";
import React from "react";
import ReactDOM from "react-dom";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as jsxRuntime from "react/jsx-runtime";
import { ComponentLookup } from "./component-lookup";
import { createUseGlobalVariant } from "./global-variants";
import {
  FetchComponentDataOpts,
  InitOptions,
  ReactServerPlasmicComponentLoader,
} from "./loader-react-server";
import type { GlobalVariantSpec } from "./PlasmicRootProvider";
import { ComponentLookupSpec, getCompMetas, isBrowser, uniq } from "./utils";
import { getPlasmicCookieValues, updatePlasmicCookieValue } from "./variation";

export interface ComponentRenderData {
  entryCompMetas: (ComponentMeta & { params?: Record<string, string> })[];
  bundle: LoaderBundleOutput;
  remoteFontUrls: string[];
}

interface ComponentSubstitutionSpec {
  lookup: ComponentLookupSpec;
  component: React.ComponentType<any>;
  codeComponentHelpers?: InternalCodeComponentHelpers<
    React.ComponentProps<any>
  >;
}

interface PlasmicRootWatcher {
  onDataFetched?: () => void;
}

export type CodeComponentMeta<P> = Omit<
  InternalCodeComponentMeta<P>,
  "importPath" | "componentHelpers" | "states"
> & {
  /**
   * The path to be used when importing the component in the generated code.
   * It can be the name of the package that contains the component, or the path
   * to the file in the project (relative to the root directory).
   * Optional: not used by Plasmic headless API, only by codegen.
   */
  importPath?: string;
  /**
   * The states helpers are registered together with the states for the Plasmic headless API
   */
  states?: Record<string, StateSpec<P> & StateHelpers<P, any>>;
};

export type GlobalContextMeta<P> = Omit<
  InternalGlobalContextMeta<P>,
  "importPath"
> & {
  /**
   * The path to be used when importing the component in the generated code.
   * It can be the name of the package that contains the component, or the path
   * to the file in the project (relative to the root directory).
   * Optional: not used by Plasmic headless API, only by codegen.
   */
  importPath?: string;
};

export type CustomFunctionMeta<F extends (...args: any[]) => any> = Omit<
  InternalCustomFunctionMeta<F>,
  "importPath"
> & {
  /**
   * The path to be used when importing the function in the generated code.
   * It can be the name of the package that contains the function, or the path
   * to the file in the project (relative to the root directory).
   * Optional: not used by Plasmic headless API, only by codegen.
   */
  importPath?: string;
};

export type FetchPagesOpts = {
  /**
   * Whether to include dynamic pages in fetchPages() output. A page is
   * considered dynamic if its path contains some param between brackets,
   * e.g. "[slug]".
   */
  includeDynamicPages?: boolean;
};

const SUBSTITUTED_COMPONENTS: Record<string, React.ComponentType<any>> = {};
const REGISTERED_CODE_COMPONENT_HELPERS: Record<
  string,
  InternalCodeComponentHelpers<React.ComponentProps<any>>
> = {};
const SUBSTITUTED_GLOBAL_VARIANT_HOOKS: Record<string, () => any> = {};
const REGISTERED_CUSTOM_FUNCTIONS: Record<string, (...args: any[]) => any> = {};

function customFunctionImportAlias<F extends (...args: any[]) => any>(
  meta: CustomFunctionMeta<F>
) {
  const customFunctionPrefix = `__fn_`;
  return meta.namespace
    ? `${customFunctionPrefix}${meta.namespace}__${meta.name}`
    : `${customFunctionPrefix}${meta.name}`;
}

export class InternalPlasmicComponentLoader {
  private readonly reactServerLoader: ReactServerPlasmicComponentLoader;
  private readonly registry = new Registry();
  private subs: ComponentSubstitutionSpec[] = [];
  private roots: PlasmicRootWatcher[] = [];
  private globalVariants: GlobalVariantSpec[] = [];
  private tracker: PlasmicTracker;

  constructor(public opts: InitOptions) {
    this.tracker = new PlasmicTracker({
      projectIds: opts.projects.map((p) => p.id),
      platform: opts.platform,
      preview: opts.preview,
      nativeFetch: opts.nativeFetch,
    });
    this.reactServerLoader = new ReactServerPlasmicComponentLoader({
      opts,
      fetcher: new PlasmicModulesFetcher(opts),
      tracker: this.tracker,
      onBundleMerged: () => {
        this.refreshRegistry();
      },
      onBundleFetched: () => {
        this.roots.forEach((watcher) => watcher.onDataFetched?.());
      },
    });

    this.registerModules({
      react: React,
      "react-dom": ReactDOM,
      "react/jsx-runtime": jsxRuntime,
      "react/jsx-dev-runtime": jsxDevRuntime,

      // Also inject @plasmicapp/query and @plasmicapp/host to use the
      // same contexts here and in loader-downloaded code.
      "@plasmicapp/query": PlasmicQuery,
      "@plasmicapp/data-sources-context": PlasmicDataSourcesContext,
      "@plasmicapp/host": PlasmicHost,
      "@plasmicapp/loader-runtime-registry": {
        components: SUBSTITUTED_COMPONENTS,
        globalVariantHooks: SUBSTITUTED_GLOBAL_VARIANT_HOOKS,
        codeComponentHelpers: REGISTERED_CODE_COMPONENT_HELPERS,
        functions: REGISTERED_CUSTOM_FUNCTIONS,
      },
    });
  }

  getBundle() {
    return this.reactServerLoader.getBundle();
  }

  setGlobalVariants(globalVariants: GlobalVariantSpec[]) {
    this.globalVariants = globalVariants;
  }

  getGlobalVariants() {
    return this.globalVariants;
  }

  registerModules(modules: Record<string, any>) {
    if (
      Object.keys(modules).some(
        (name) => this.registry.getRegisteredModule(name) !== modules[name]
      )
    ) {
      if (!this.registry.isEmpty()) {
        console.warn(
          "Calling PlasmicComponentLoader.registerModules() after Plasmic component has rendered; starting over."
        );
        this.registry.clear();
      }
      for (const key of Object.keys(modules)) {
        this.registry.register(key, modules[key]);
      }
    }
  }

  substituteComponent<P>(
    component: React.ComponentType<P>,
    name: ComponentLookupSpec
  ) {
    this.internalSubstituteComponent(component, name, undefined);
  }

  private internalSubstituteComponent<P>(
    component: React.ComponentType<P>,
    name: ComponentLookupSpec,
    codeComponentHelpers:
      | InternalCodeComponentHelpers<
          React.ComponentProps<React.ComponentType<P>>
        >
      | undefined
  ) {
    if (!this.registry.isEmpty()) {
      console.warn(
        "Calling PlasmicComponentLoader.registerSubstitution() after Plasmic component has rendered; starting over."
      );
      this.registry.clear();
    }
    this.subs.push({ lookup: name, component, codeComponentHelpers });
  }

  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ) {
    // making the component meta consistent between codegen and loader
    const stateHelpers = Object.fromEntries(
      Object.entries(meta.states ?? {})
        .filter(([_, stateSpec]) =>
          Object.keys(stateSpec).some((key) => stateHelpersKeys.includes(key))
        )
        .map(([stateName, stateSpec]) => [
          stateName,
          Object.fromEntries(
            stateHelpersKeys
              .filter((key) => key in stateSpec)
              .map((key) => [key, stateSpec[key]])
          ),
        ])
    );
    const helpers = { states: stateHelpers };
    this.internalSubstituteComponent(
      component,
      { name: meta.name, isCode: true },
      Object.keys(stateHelpers).length > 0 ? helpers : undefined
    );
    registerComponent(component, {
      ...meta,
      // Import path is not used as we will use component substitution
      importPath: meta.importPath ?? "",
      ...(Object.keys(stateHelpers).length > 0
        ? {
            componentHelpers: {
              helpers,
              importPath: "",
              importName: "",
            },
          }
        : {}),
    });
  }

  registerFunction<F extends (...args: any[]) => any>(
    fn: F,
    meta: CustomFunctionMeta<F>
  ) {
    registerFunction(fn, {
      ...meta,
      importPath: meta.importPath ?? "",
    });
    REGISTERED_CUSTOM_FUNCTIONS[customFunctionImportAlias(meta)] = fn;
  }

  registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ) {
    this.substituteComponent(context, { name: meta.name, isCode: true });
    // Import path is not used as we will use component substitution
    registerGlobalContext(context, {
      ...meta,
      importPath: meta.importPath ?? "",
    });
  }

  registerTrait(trait: string, meta: TraitMeta) {
    registerTrait(trait, meta);
  }

  registerToken(token: TokenRegistration) {
    registerToken(token);
  }

  registerPrefetchedBundle(bundle: LoaderBundleOutput) {
    // For React Server Components (Next.js 13+),
    // we need to pass server modules in LoaderBundleOutput from Server Components to Client Components.
    // We don't want to pass them via normal page props because that will be serialized to the browser.
    // Instead, we pass the bundle (including the server modules) via the Node `global` variable.
    //
    // This is the code that reads the stored bundle and merges it back into the loader.
    if (!isBrowser) {
      // Check if we have a cached bundle on this Node server.
      const cachedBundle = internal_getCachedBundleInNodeServer(this.opts);
      if (cachedBundle) {
        // If it's there, merge the cached bundle first.
        this.reactServerLoader.mergeBundle(cachedBundle);
      }
    }
    this.reactServerLoader.mergeBundle(bundle);
  }

  subscribePlasmicRoot(watcher: PlasmicRootWatcher) {
    this.roots.push(watcher);
  }

  unsubscribePlasmicRoot(watcher: PlasmicRootWatcher) {
    const index = this.roots.indexOf(watcher);
    if (index >= 0) {
      this.roots.splice(index, 1);
    }
  }

  clearCache() {
    this.reactServerLoader.clearCache();
    this.registry.clear();
  }

  getLookup() {
    return new ComponentLookup(this.getBundle(), this.registry);
  }

  // ReactServerLoader methods

  maybeFetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData | null>;
  maybeFetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData | null>;
  maybeFetchComponentData(...args: any[]): Promise<ComponentRenderData | null> {
    return this.reactServerLoader.maybeFetchComponentData(...args);
  }

  fetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData>;
  fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData>;
  fetchComponentData(...args: any[]): Promise<ComponentRenderData> {
    return this.reactServerLoader.fetchComponentData(...args);
  }

  fetchPages(opts?: FetchPagesOpts) {
    return this.reactServerLoader.fetchPages(opts);
  }

  fetchComponents() {
    return this.reactServerLoader.fetchComponents();
  }

  getActiveSplits() {
    return this.reactServerLoader.getActiveSplits();
  }

  getChunksUrl(bundle: LoaderBundleOutput, modules: CodeModule[]) {
    return this.reactServerLoader.getChunksUrl(bundle, modules);
  }

  trackConversion(value = 0) {
    this.tracker.trackConversion(value);
  }

  public async getActiveVariation(opts: {
    traits: Record<string, string | number | boolean>;
    getKnownValue: (key: string) => string | undefined;
    updateKnownValue: (key: string, value: string) => void;
  }) {
    await this.reactServerLoader.fetchComponents();
    return getActiveVariation({
      ...opts,
      splits: this.getBundle().activeSplits,
    });
  }

  public getTeamIds(): string[] {
    return uniq(
      this.getBundle()
        .projects.map((p) =>
          p.teamId ? `${p.teamId}${p.indirect ? "@indirect" : ""}` : null
        )
        .filter((x): x is string => !!x)
    );
  }

  public getProjectIds(): string[] {
    return uniq(
      this.getBundle().projects.map(
        (p) => `${p.id}${p.indirect ? "@indirect" : ""}`
      )
    );
  }

  public trackRender(opts?: TrackRenderOptions) {
    this.tracker.trackRender(opts);
  }

  private refreshRegistry() {
    // Once we have received data, we register components to
    // substitute.  We had to wait for data to do this so
    // that we can look up the right module name to substitute
    // in component meta.
    for (const sub of this.subs) {
      const metas = getCompMetas(this.getBundle().components, sub.lookup);
      metas.forEach((meta) => {
        SUBSTITUTED_COMPONENTS[meta.id] = sub.component;
        if (sub.codeComponentHelpers) {
          REGISTERED_CODE_COMPONENT_HELPERS[meta.id] = sub.codeComponentHelpers;
        }
      });
    }

    // We also swap global variants' useXXXGlobalVariant() hook with
    // a fake one that just reads from the PlasmicRootContext. Because
    // global variant values are not supplied by the generated global variant
    // context providers, but instead by <PlasmicRootProvider/> and by
    // PlasmicComponentLoader.setGlobalVariants(), we redirect these
    // hooks to read from them instead.
    for (const globalGroup of this.getBundle().globalGroups) {
      if (globalGroup.type !== "global-screen") {
        SUBSTITUTED_GLOBAL_VARIANT_HOOKS[globalGroup.id] =
          createUseGlobalVariant(globalGroup.name, globalGroup.projectId);
      }
    }
    this.registry.updateModules(this.getBundle());
  }
}

/**
 * Library for fetching component data, and registering
 * custom components.
 */
export class PlasmicComponentLoader {
  private __internal: InternalPlasmicComponentLoader;
  constructor(internal: InternalPlasmicComponentLoader) {
    this.__internal = internal;
  }

  /**
   * Sets global variants to be used for all components.  Note that
   * this is not reactive, and will not re-render all components
   * already mounted; instead, it should be used to activate global
   * variants that should always be activated for the lifetime of this
   * app.  If you'd like to reactively change the global variants,
   * you should specify them via <PlasmicRootProvider />
   */
  setGlobalVariants(globalVariants: GlobalVariantSpec[]) {
    this.__internal.setGlobalVariants(globalVariants);
  }

  registerModules(modules: Record<string, any>) {
    this.__internal.registerModules(modules);
  }

  /**
   * Register custom components that should be swapped in for
   * components defined in your project.  You can use this to
   * swap in / substitute a Plasmic component with a "real" component.
   */
  substituteComponent<P>(
    component: React.ComponentType<P>,
    name: ComponentLookupSpec
  ) {
    this.__internal.substituteComponent(component, name);
  }

  /**
   * Register code components to be used on Plasmic Editor.
   */
  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ): void;

  /**
   * [[deprecated]] Please use `substituteComponent` instead for component
   * substitution, or the other `registerComponent` overload to register
   * code components to be used on Plasmic Editor.
   *
   * @see `substituteComponent`
   */
  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    name: ComponentLookupSpec
  ): void;

  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    metaOrName: ComponentLookupSpec | CodeComponentMeta<React.ComponentProps<T>>
  ) {
    // 'props' is a required field in CodeComponentMeta
    if (metaOrName && typeof metaOrName === "object" && "props" in metaOrName) {
      this.__internal.registerComponent(component, metaOrName);
    } else {
      // Deprecated call
      if (
        process.env.NODE_ENV === "development" &&
        !this.warnedRegisterComponent
      ) {
        console.warn(
          `PlasmicLoader: Using deprecated method \`registerComponent\` for component substitution. ` +
            `Please consider using \`substituteComponent\` instead.`
        );
        this.warnedRegisterComponent = true;
      }
      this.substituteComponent(component, metaOrName);
    }
  }
  private warnedRegisterComponent = false;

  registerFunction<F extends (...args: any[]) => any>(
    fn: F,
    meta: CustomFunctionMeta<F>
  ) {
    this.__internal.registerFunction(fn, meta);
  }

  registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ) {
    this.__internal.registerGlobalContext(context, meta);
  }

  registerTrait(trait: string, meta: TraitMeta) {
    this.__internal.registerTrait(trait, meta);
  }

  registerToken(token: TokenRegistration) {
    this.__internal.registerToken(token);
  }

  /**
   * Pre-fetches component data needed to for PlasmicLoader to render
   * these components.  Should be passed into PlasmicRootProvider as
   * the prefetchedData prop.
   *
   * You can look up a component either by:
   * - the name of the component
   * - the path for a page component
   * - an array of strings that make up parts of the path
   * - object { name: "name_or_path", projectId: ...}, to specify which project
   *   to use, if multiple projects have the same component name
   *
   * Throws an Error if a specified component to fetch does not exist in
   * the Plasmic project.
   */
  async fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData> {
    return this.__internal.fetchComponentData(...specs);
  }

  /**
   * Like fetchComponentData(), but returns null instead of throwing an Error
   * when a component is not found.  Useful when you are implementing a catch-all
   * page and want to check if a specific path had been defined for Plasmic.
   */
  async maybeFetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData | null> {
    return this.__internal.maybeFetchComponentData(...specs);
  }

  /**
   * Returns all the page component metadata for these projects.
   */
  async fetchPages(opts?: FetchPagesOpts) {
    return this.__internal.fetchPages(opts);
  }

  /**
   * Returns all components metadata for these projects.
   */
  async fetchComponents() {
    return this.__internal.fetchComponents();
  }

  protected async _getActiveVariation(opts: {
    traits: Record<string, string | number | boolean>;
    getKnownValue: (key: string) => string | undefined;
    updateKnownValue: (key: string, value: string) => void;
  }) {
    return this.__internal.getActiveVariation(opts);
  }

  async getActiveVariation(opts: {
    known?: Record<string, string>;
    traits: Record<string, string | number | boolean>;
  }) {
    return this._getActiveVariation({
      traits: opts.traits,
      getKnownValue: (key: string) => {
        if (opts.known) {
          return opts.known[key];
        } else {
          const cookies = getPlasmicCookieValues();
          return cookies[key];
        }
      },
      updateKnownValue: (key: string, value: string) => {
        if (!opts.known) {
          updatePlasmicCookieValue(key, value);
        }
      },
    });
  }

  getChunksUrl(bundle: LoaderBundleOutput, modules: CodeModule[]) {
    return this.__internal.getChunksUrl(bundle, modules);
  }

  getExternalVariation(
    variation: Record<string, string>,
    filters?: Parameters<typeof getExternalIds>[2]
  ) {
    return getExternalIds(this.getActiveSplits(), variation, filters);
  }

  getActiveSplits() {
    return this.__internal.getActiveSplits();
  }

  trackConversion(value = 0) {
    this.__internal.trackConversion(value);
  }

  clearCache() {
    return this.__internal.clearCache();
  }
}
