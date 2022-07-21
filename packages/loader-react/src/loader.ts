import * as PlasmicHost from '@plasmicapp/host';
import {
  ComponentMeta as InternalCodeComponentMeta,
  GlobalContextMeta as InternalGlobalContextMeta,
  registerComponent,
  registerGlobalContext,
  registerTrait,
  TraitMeta,
} from '@plasmicapp/host';
import {
  ComponentMeta,
  LoaderBundleCache,
  LoaderBundleOutput,
  PageMeta,
  PlasmicModulesFetcher,
  PlasmicTracker,
  Registry,
  TrackRenderOptions,
} from '@plasmicapp/loader-core';
import { getActiveVariation, getExternalIds } from '@plasmicapp/loader-splits';
import * as PlasmicQuery from '@plasmicapp/query';
import React from 'react';
import ReactDOM from 'react-dom';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import { mergeBundles, prepComponentData } from './bundles';
import { ComponentLookup } from './component-lookup';
import { createUseGlobalVariant } from './global-variants';
import { GlobalVariantSpec } from './PlasmicRootProvider';
import { ComponentLookupSpec, getCompMetas, getLookupSpecName } from './utils';
import { getPlasmicCookieValues, updatePlasmicCookieValue } from './variation';

export interface InitOptions {
  projects: ProjectOption[];
  cache?: LoaderBundleCache;
  platform?: 'react' | 'nextjs' | 'gatsby';
  preview?: boolean;
  host?: string;
  onClientSideFetch?: 'warn' | 'error';

  /**
   * By default, fetchComponentData() and fetchPages() calls cached in memory
   * with the PlasmicComponentLoader instance.  If alwaysFresh is true, then
   * data is always freshly fetched over the network.
   */
  alwaysFresh?: boolean;
}

const isBrowser = typeof window !== 'undefined';

interface ProjectOption {
  id: string;
  token: string;
  version?: string;
}

export interface ComponentRenderData {
  entryCompMetas: ComponentMeta[];
  bundle: LoaderBundleOutput;
  remoteFontUrls: string[];
}

interface ComponentSubstitutionSpec {
  lookup: ComponentLookupSpec;
  component: React.ComponentType<any>;
}

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPlasmicComponentLoader(opts);
  return new PlasmicComponentLoader(internal);
}

interface PlasmicRootWatcher {
  onDataFetched?: () => void;
}

export type CodeComponentMeta<P> = Omit<
  InternalCodeComponentMeta<P>,
  'importPath'
> & {
  /**
   * The path to be used when importing the component in the generated code.
   * It can be the name of the package that contains the component, or the path
   * to the file in the project (relative to the root directory).
   * Optional: not used by Plasmic headless API, only by codegen.
   */
  importPath?: string;
};

export type GlobalContextMeta<P> = Omit<
  InternalGlobalContextMeta<P>,
  'importPath'
> & {
  /**
   * The path to be used when importing the component in the generated code.
   * It can be the name of the package that contains the component, or the path
   * to the file in the project (relative to the root directory).
   * Optional: not used by Plasmic headless API, only by codegen.
   */
  importPath?: string;
};

export class InternalPlasmicComponentLoader {
  private fetcher: PlasmicModulesFetcher;
  private registry: Registry;
  private subs: ComponentSubstitutionSpec[] = [];
  private roots: PlasmicRootWatcher[] = [];
  private globalVariants: GlobalVariantSpec[] = [];
  private bundle: LoaderBundleOutput = {
    modules: {
      browser: [],
      server: [],
    },
    components: [],
    globalGroups: [],
    external: [],
    projects: [],
    activeSplits: [],
  };
  private tracker: PlasmicTracker;

  private substitutedComponents: Record<string, React.ComponentType<any>> = {};
  private substitutedGlobalVariantHooks: Record<string, () => any> = {};

  constructor(private opts: InitOptions) {
    this.registry = Registry.getInstance();
    this.fetcher = new PlasmicModulesFetcher(opts);
    this.tracker = new PlasmicTracker({
      projectIds: opts.projects.map((p) => p.id),
      platform: opts.platform,
      preview: opts.preview,
    });

    this.registerModules({
      react: React,
      'react-dom': ReactDOM,
      'react/jsx-runtime': jsxRuntime,
      'react/jsx-dev-runtime': jsxDevRuntime,

      // Also inject @plasmicapp/query and @plasmicapp/host to use the
      // same contexts here and in loader-downloaded code.
      '@plasmicapp/query': PlasmicQuery,
      '@plasmicapp/host': PlasmicHost,
      '@plasmicapp/loader-runtime-registry': {
        components: this.substitutedComponents,
        globalVariantHooks: this.substitutedGlobalVariantHooks,
      },
    });
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
          'Calling PlasmicComponentLoader.registerModules() after Plasmic component has rendered; starting over.'
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
    if (!this.registry.isEmpty()) {
      console.warn(
        'Calling PlasmicComponentLoader.registerSubstitution() after Plasmic component has rendered; starting over.'
      );
      this.registry.clear();
    }
    this.subs.push({ lookup: name, component });
  }

  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ) {
    this.substituteComponent(component, { name: meta.name, isCode: true });
    // Import path is not used as we will use component substitution
    registerComponent(component, {
      ...meta,
      importPath: meta.importPath ?? '',
    });
  }

  registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ) {
    this.substituteComponent(context, { name: meta.name, isCode: true });
    // Import path is not used as we will use component substitution
    registerGlobalContext(context, {
      ...meta,
      importPath: meta.importPath ?? '',
    });
  }

  registerTrait(trait: string, meta: TraitMeta) {
    registerTrait(trait, meta);
  }

  registerPrefetchedBundle(bundle: LoaderBundleOutput) {
    this.mergeBundle(bundle);
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
    this.bundle = {
      modules: {
        browser: [],
        server: [],
      },
      components: [],
      globalGroups: [],
      external: [],
      projects: [],
      activeSplits: [],
    };
    this.registry.clear();
  }

  private maybeGetCompMetas(...specs: ComponentLookupSpec[]) {
    return maybeGetCompMetas(this.bundle.components, specs);
  }

  async maybeFetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData | null> {
    const returnWithSpecsToFetch = async (
      specsToFetch: ComponentLookupSpec[]
    ) => {
      await this.fetchMissingData({ missingSpecs: specsToFetch });
      const {
        found: existingMetas2,
        missing: missingSpecs2,
      } = this.maybeGetCompMetas(...specs);
      if (missingSpecs2.length > 0) {
        return null;
      }

      return prepComponentData(this.bundle, ...existingMetas2);
    };

    if (this.opts.alwaysFresh) {
      // If alwaysFresh, then we treat all specs as missing
      return await returnWithSpecsToFetch(specs);
    }

    // Else we only fetch actually missing specs
    const {
      found: existingMetas,
      missing: missingSpecs,
    } = this.maybeGetCompMetas(...specs);
    if (missingSpecs.length === 0) {
      return prepComponentData(this.bundle, ...existingMetas);
    }

    return await returnWithSpecsToFetch(missingSpecs);
  }

  async fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData> {
    const data = await this.maybeFetchComponentData(...specs);

    if (!data) {
      const { missing: missingSpecs } = this.maybeGetCompMetas(...specs);
      throw new Error(
        `Unable to find components ${missingSpecs
          .map(getLookupSpecName)
          .join(', ')}`
      );
    }

    return data;
  }

  async fetchPages() {
    this.maybeReportClientSideFetch(
      () => `Plasmic: fetching all page metadata in the browser`
    );
    const data = await this.fetchAllData();
    return data.components.filter(
      (comp) => comp.isPage && comp.path
    ) as PageMeta[];
  }

  async fetchComponents() {
    this.maybeReportClientSideFetch(
      () => `Plasmic: fetching all component metadata in the browser`
    );
    const data = await this.fetchAllData();
    return data.components;
  }

  getLookup() {
    return new ComponentLookup(this.bundle, this.registry);
  }

  getActiveSplits() {
    return this.bundle.activeSplits;
  }

  trackConversion(value: number = 0) {
    this.tracker.trackConversion(value);
  }

  // @ts-ignore
  private async fetchMissingData(opts: {
    missingSpecs: ComponentLookupSpec[];
  }) {
    // TODO: do better than just fetching everything
    this.maybeReportClientSideFetch(
      () =>
        `Plasmic: fetching missing components in the browser: ${opts.missingSpecs
          .map((spec) => getLookupSpecName(spec))
          .join(', ')}`
    );
    return this.fetchAllData();
  }

  private maybeReportClientSideFetch(mkMsg: () => string) {
    if (isBrowser && this.opts.onClientSideFetch) {
      const msg = mkMsg();
      if (this.opts.onClientSideFetch === 'warn') {
        console.warn(msg);
      } else {
        throw new Error(msg);
      }
    }
  }

  public async getActiveVariation(opts: {
    traits: Record<string, string | number | boolean>;
    getKnownValue: (key: string) => string | undefined;
    updateKnownValue: (key: string, value: string) => void;
  }) {
    await this.fetchAllData();
    return getActiveVariation({
      ...opts,
      splits: this.bundle.activeSplits,
    });
  }

  public getTeamIds(): string[] {
    return this.bundle.projects
      .map((p) => p.teamId)
      .filter((x): x is string => !!x);
  }

  public trackRender(opts?: TrackRenderOptions) {
    this.tracker.trackRender(opts);
  }

  private async fetchAllData() {
    const bundle = await this.ensureFetcher().fetchAllData();
    this.tracker.trackFetch();
    this.mergeBundle(bundle);
    this.roots.forEach((watcher) => watcher.onDataFetched?.());
    return bundle;
  }

  private mergeBundle(bundle: LoaderBundleOutput) {
    this.bundle = mergeBundles(bundle, this.bundle);
    this.refreshRegistry();
  }

  private refreshRegistry() {
    // Once we have received data, we register components to
    // substitute.  We had to wait for data to do this so
    // that we can look up the right module name to substitute
    // in component meta.
    for (const sub of this.subs) {
      const metas = getCompMetas(this.bundle.components, sub.lookup);
      metas.forEach((meta) => {
        this.substitutedComponents[meta.id] = sub.component;
      });
    }

    // We also swap global variants' useXXXGlobalVariant() hook with
    // a fake one that just reads from the PlasmicRootContext. Because
    // global variant values are not supplied by the generated global variant
    // context providers, but instead by <PlasmicRootProvider/> and by
    // PlasmicComponentLoader.setGlobalVariants(), we redirect these
    // hooks to read from them instead.
    for (const globalGroup of this.bundle.globalGroups) {
      if (globalGroup.type !== 'global-screen') {
        this.substitutedGlobalVariantHooks[
          globalGroup.id
        ] = createUseGlobalVariant(globalGroup.name, globalGroup.projectId);
      }
    }
    this.registry.updateModules(this.bundle);
  }

  private ensureFetcher() {
    if (!this.fetcher) {
      throw new Error(`You must first call PlasmicComponentLoader.init()`);
    }
    return this.fetcher;
  }
}

function maybeGetCompMetas(
  metas: ComponentMeta[],
  specs: ComponentLookupSpec[]
) {
  const found = new Set<ComponentMeta>();
  const missing: ComponentLookupSpec[] = [];
  for (const spec of specs) {
    const filteredMetas = getCompMetas(metas, spec);
    if (filteredMetas.length > 0) {
      filteredMetas.forEach((meta) => found.add(meta));
    } else {
      missing.push(spec);
    }
  }
  return { found: Array.from(found.keys()), missing };
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
    if (metaOrName && typeof metaOrName === 'object' && 'props' in metaOrName) {
      this.__internal.registerComponent(component, metaOrName);
    } else {
      // Deprecated call
      if (
        process.env.NODE_ENV === 'development' &&
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

  registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ) {
    this.__internal.registerGlobalContext(context, meta);
  }

  registerTrait(trait: string, meta: TraitMeta) {
    this.__internal.registerTrait(trait, meta);
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
  async fetchPages() {
    return this.__internal.fetchPages();
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

  getExternalVariation(variation: Record<string, string>) {
    return getExternalIds(this.getActiveSplits(), variation);
  }

  getActiveSplits() {
    return this.__internal.getActiveSplits();
  }

  trackConversion(value: number = 0) {
    this.__internal.trackConversion(value);
  }

  clearCache() {
    return this.__internal.clearCache();
  }
}
