import {
  ComponentMeta,
  getBundleSubset,
  LoaderBundleCache,
  LoaderBundleOutput,
  PageMeta,
  PlasmicModulesFetcher,
  Registry,
} from '@plasmicapp/loader-core';
import React from 'react';
import ReactDOM from 'react-dom';
import { mergeBundles } from './bundles';
import { ComponentLookup } from './component-lookup';
import { createUseGlobalVariant } from './global-variants';
import { GlobalVariantSpec } from './PlasmicRootProvider';
import { ComponentLookupSpec, getCompMeta } from './utils';

export interface InitOptions {
  projects: ProjectOption[];
  cache?: LoaderBundleCache;
  platform?: 'react' | 'nextjs' | 'gatsby';
  preview?: boolean;
  host?: string;
}

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
  component: React.ComponentType;
}

export function initPlasmicLoader(opts: InitOptions): PlasmicComponentLoader {
  const internal = new InternalPlasmicComponentLoader(opts);
  internal.registerModules({
    react: React,
    'react-dom': ReactDOM,
  });
  return new PlasmicComponentLoader(internal);
}

interface PlasmicRootWatcher {
  onDataFetched?: () => void;
}

export class InternalPlasmicComponentLoader {
  private fetcher: PlasmicModulesFetcher;
  private registry: Registry;
  private subs: ComponentSubstitutionSpec[] = [];
  private roots: PlasmicRootWatcher[] = [];
  private globalVariants: GlobalVariantSpec[] = [];
  private bundle: LoaderBundleOutput = {
    modules: [],
    components: [],
    globalGroups: [],
    external: [],
    projects: [],
  };

  constructor(opts: InitOptions) {
    this.registry = new Registry();
    this.fetcher = new PlasmicModulesFetcher(opts);
  }

  setGlobalVariants(globalVariants: GlobalVariantSpec[]) {
    this.globalVariants = globalVariants;
  }

  getGlobalVariants() {
    return this.globalVariants;
  }

  registerModules(modules: Record<string, any>) {
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

  registerComponent(component: React.ComponentType, name: ComponentLookupSpec) {
    if (!this.registry.isEmpty()) {
      console.warn(
        'Calling PlasmicComponentLoader.registerSubstitution() after Plasmic component has rendered; starting over.'
      );
      this.registry.clear();
    }
    this.subs.push({ lookup: name, component });
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
      modules: [],
      components: [],
      globalGroups: [],
      external: [],
      projects: [],
    };
    this.registry.clear();
  }

  private maybeGetCompMetas(...specs: ComponentLookupSpec[]) {
    return maybeGetCompMetas(this.bundle.components, specs);
  }

  async fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData> {
    const {
      found: existingMetas,
      missing: missingSpecs,
    } = this.maybeGetCompMetas(...specs);
    if (missingSpecs.length === 0) {
      return this.prepComponentData(this.bundle, ...existingMetas);
    }

    // TODO: incrementally fetch only what's needed, instead of fetching all
    await this.fetchMissingData({ missingSpecs });

    // Now we should have all the data we need
    return await this.fetchComponentData(...specs);
  }

  async fetchPages() {
    const data = await this.fetchAllData();
    return data.components.filter(
      (comp) => comp.isPage && comp.path
    ) as PageMeta[];
  }

  getLookup() {
    return new ComponentLookup(this.bundle, this.registry);
  }

  // @ts-ignore
  private async fetchMissingData(opts: {
    missingSpecs?: ComponentLookupSpec[];
  }) {
    // TODO: do better than just fetching everything
    return this.fetchAllData();
  }

  private async fetchAllData() {
    const bundle = await this.ensureFetcher().fetchAllData();
    this.mergeBundle(bundle);
    this.roots.forEach((watcher) => watcher.onDataFetched?.());
    return bundle;
  }

  private mergeBundle(bundle: LoaderBundleOutput) {
    this.bundle = mergeBundles(this.bundle, bundle);
    this.refreshRegistry();
  }

  private refreshRegistry() {
    // Once we have received data, we register components to
    // substitute.  We had to wait for data to do this so
    // that we can look up the right module name to substitute
    // in component meta.
    for (const sub of this.subs) {
      const meta = getCompMeta(this.bundle.components, sub.lookup);
      if (meta) {
        this.registry.register(meta.entry, { default: sub.component });
      }
    }

    // We also swap global variants' useXXXGlobalVariant() hook with
    // a fake one that just reads from the PlasmicRootContext. Because
    // global variant values are not supplied by the generated global variant
    // context providers, but instead by <PlasmicRootProvider/> and by
    // PlasmicComponentLoader.setGlobalVariants(), we redirect these
    // hooks to read from them instead.
    for (const globalGroup of this.bundle.globalGroups) {
      if (globalGroup.type !== 'global-screen') {
        this.registry.register(globalGroup.contextFile, {
          [globalGroup.useName]: createUseGlobalVariant(
            globalGroup.name,
            globalGroup.projectId
          ),
        });
      }
    }
    this.registry.updateModules(this.bundle);
  }

  private prepComponentData(
    bundle: LoaderBundleOutput,
    ...compMetas: ComponentMeta[]
  ): ComponentRenderData {
    if (compMetas.length === 0) {
      return {
        entryCompMetas: bundle.components,
        bundle: bundle,
        remoteFontUrls: [],
      };
    }

    const compPaths = compMetas.map((compMeta) => compMeta.entry);
    const subBundle = getBundleSubset(
      bundle,
      ...compPaths,
      'root-provider.js',
      'entrypoint.css',
      ...bundle.globalGroups.map((g) => g.contextFile)
    );

    const remoteFontUrls: string[] = [];
    subBundle.projects.forEach((p) =>
      remoteFontUrls.push(...p.remoteFonts.map((f) => f.url))
    );

    return {
      entryCompMetas: compMetas,
      bundle: subBundle,
      remoteFontUrls,
    };
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
  const found: ComponentMeta[] = [];
  const missing: ComponentLookupSpec[] = [];
  for (const spec of specs) {
    const meta = getCompMeta(metas, spec);
    if (meta) {
      found.push(meta);
    } else {
      missing.push(spec);
    }
  }
  return { found, missing };
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
   * You can also use this to register your code components.
   */
  registerComponent(component: React.ComponentType, name: ComponentLookupSpec) {
    this.__internal.registerComponent(component, name);
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
   */
  async fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData> {
    return this.__internal.fetchComponentData(...specs);
  }

  /**
   * Returns all the page component metadata for these projects.
   */
  async fetchPages() {
    return this.__internal.fetchPages();
  }

  clearCache() {
    return this.__internal.clearCache();
  }
}
