import type {
  ComponentHelpers,
  ComponentHelpers as InternalCodeComponentHelpers,
  CodeComponentMeta as InternalCodeComponentMeta,
  CustomFunctionMeta as InternalCustomFunctionMeta,
  GlobalContextMeta as InternalGlobalContextMeta,
  StateHelpers,
  StateSpec,
  TokenRegistration,
  TraitMeta,
  useDataEnv,
  useSelector,
  useSelectors,
} from "@plasmicapp/host";
import {
  LoaderBundleCache,
  PageMeta,
  PlasmicModulesFetcher,
  Registry,
  TrackRenderOptions,
} from "@plasmicapp/loader-core";
import {
  CodeModule,
  ComponentMeta,
  LoaderBundleOutput,
  internal_getCachedBundleInNodeServer,
} from "@plasmicapp/loader-fetcher";
import { getActiveVariation, getExternalIds } from "@plasmicapp/loader-splits";
import type { useMutablePlasmicQueryData } from "@plasmicapp/query";
import type { GlobalVariantSpec } from "./PlasmicRootProvider";
import { mergeBundles, prepComponentData } from "./bundles";
import { ComponentLookup } from "./component-lookup";
import {
  ComponentLookupSpec,
  getCompMetas,
  getLookupSpecName,
  isBrowser,
  isDynamicPagePath,
  uniq,
} from "./utils";
import { getPlasmicCookieValues, updatePlasmicCookieValue } from "./variation";

export interface InitOptions {
  projects: {
    id: string;
    token: string;
    version?: string;
  }[];
  cache?: LoaderBundleCache;
  platform?: "react" | "nextjs" | "gatsby";
  platformOptions?: {
    nextjs?: {
      appDir: boolean;
    };
  };
  preview?: boolean;
  /** Fallback for apiHost and cdnHost. */
  host?: string;
  /** Used for fetching/previewing unpublished content. */
  apiHost?: string;
  /** Used for fetching published content. */
  cdnHost?: string;
  onClientSideFetch?: "warn" | "error";
  i18n?: {
    keyScheme: "content" | "hash" | "path";
    tagPrefix?: string;
  };
  /**
   * @deprecated use i18n.keyScheme instead
   */
  i18nKeyScheme?: "content" | "hash";

  /**
   * By default, fetchComponentData() and fetchPages() calls cached in memory
   * with the PlasmicComponentLoader instance.  If alwaysFresh is true, then
   * data is always freshly fetched over the network.
   */
  alwaysFresh?: boolean;

  /**
   * If true, generated code from the server won't include page metadata tags
   */
  skipHead?: boolean;

  /**
   * If true, uses browser / node's native fetch
   */
  nativeFetch?: boolean;

  /**
   * If true, will not redirect to the codegen server automatically, and will
   * try to reuse the existing bundle in the cache.
   */
  manualRedirect?: boolean;
}

export interface ComponentRenderData {
  entryCompMetas: (ComponentMeta & { params?: Record<string, string> })[];
  bundle: LoaderBundleOutput;
  remoteFontUrls: string[];
}

export interface ComponentSubstitutionSpec {
  lookup: ComponentLookupSpec;
  component: React.ComponentType<any>;
  codeComponentHelpers?: InternalCodeComponentHelpers<
    React.ComponentProps<any>
  >;
}

export interface PlasmicRootWatcher {
  onDataFetched?: () => void;
}

/**
 * Helper functions to describe code component behaviors, in order to allow
 * data extraction in RSC / Next.js App routing.
 */
export interface ReactServerOps {
  readDataEnv: typeof useDataEnv;
  readDataSelector: typeof useSelector;
  readDataSelectors: typeof useSelectors;
  /**
   * The contexts are passed using a key instead of the context provider
   * Notice it cannot access the default context value if none has been provided,
   * since React server components cannot create contexts.
   */
  readContext: (contextKey: string) => any;
  /**
   * Allows data fetching from the code component and caching the result,
   * which will be stored in the `queryCache` returned by
   * `extractPlasmicQueryData`.
   */
  fetchData: typeof useMutablePlasmicQueryData;
}

/**
 * Represents data provided by a code component via `DataProvider`
 */
export interface ServerProvidedData {
  name: string;
  data: any;
}

/**
 * Provides a new value for a given context key, similar to Context.Provider.
 * The context itself is not available (RSC doesn't allow calling
 * `createContext`) so each context will need to be represented as a unique
 * "context key". Also it means the default context value is not available
 * in case no value is passed (and reading that context will return `undefined`)
 */
export interface ServerProvidedContext {
  /**
   * Identifier to the context, required to read it later via
   * `ReactServerOps.readContext()`.
   */
  contextKey: string;
  /**
   * Context value being provided (similar to `Context.Provider`).
   */
  value: any;
}

/**
 *  Each child of a code component might receive separate `DataProvider` and
 *  Context values.
 */
export interface ServerChildData {
  providedData?: ServerProvidedData | ServerProvidedData[];
  providedContexts?: ServerProvidedContext | ServerProvidedContext[];
  node: React.ReactNode;
}

export interface ServerInfo {
  /**
   * Optional: Indicates the React Nodes created by the component and the
   * respective contexts provided to them. If not specified, it will render the
   * children passed to the component as props.
   */
  children?: ServerChildData | ServerChildData[];
  providedData?: ServerProvidedData | ServerProvidedData[];
  providedContexts?: ServerProvidedContext | ServerProvidedContext[];
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

  /**
   * Helper function to enable data extraction when running Plasmic from
   * Next.js App Router.
   */
  getServerInfo?: (props: P, ops: ReactServerOps) => ServerInfo;
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

type ParamsRecord = Record<string, string | string[] | undefined>;

export const SUBSTITUTED_COMPONENTS: Record<
  string,
  React.ComponentType<any>
> = {};
export const REGISTERED_CODE_COMPONENT_HELPERS: Record<
  string,
  InternalCodeComponentHelpers<React.ComponentProps<any>>
> = {};
export const SUBSTITUTED_GLOBAL_VARIANT_HOOKS: Record<string, () => any> = {};
export const REGISTERED_CUSTOM_FUNCTIONS: Record<
  string,
  (...args: any[]) => any
> = {};

export function customFunctionImportAlias<F extends (...args: any[]) => any>(
  meta: CustomFunctionMeta<F>
) {
  const customFunctionPrefix = `__fn_`;
  return meta.namespace
    ? `${customFunctionPrefix}${meta.namespace}__${meta.name}`
    : `${customFunctionPrefix}${meta.name}`;
}

export function internalSetRegisteredFunction<
  F extends (...args: any[]) => any
>(fn: F, meta: CustomFunctionMeta<F>) {
  REGISTERED_CUSTOM_FUNCTIONS[customFunctionImportAlias(meta)] = fn;
}

interface BuiltinRegisteredModules {
  react: typeof import("react");
  "react-dom": typeof import("react-dom");
  "react/jsx-runtime": typeof import("react/jsx-runtime");
  "react/jsx-dev-runtime": typeof import("react/jsx-dev-runtime");
  "@plasmicapp/query": typeof import("@plasmicapp/query");
  "@plasmicapp/data-sources-context": typeof import("@plasmicapp/data-sources-context");
  "@plasmicapp/host": typeof import("@plasmicapp/host");
  "@plasmicapp/loader-runtime-registry": {
    components: Record<string, React.ComponentType<any>>;
    globalVariantHooks: Record<string, () => any>;
    codeComponentHelpers: Record<string, ComponentHelpers<any>>;
    functions: Record<string, (...args: any[]) => any>;
  };
}

export interface FetchComponentDataOpts {
  /**
   * Will fetch either code targeting SSR or browser hydration in the
   * returned bundle.
   *
   * By default, the target is browser. That's okay, because even when
   * doing SSR, as long as you are using the same instance of PlasmicLoader
   * that was used to fetch component data, it will still know how to get at
   * the server code.
   *
   * But, if you are building your own SSR solution, where fetching and rendering
   * are using different instances of PlasmicLoader, then you'll want to make
   * sure that when you fetch, you are fetching the right one to be used in the
   * right environment for either SSR or browser hydration.
   */
  target?: "server" | "browser";
}

function parseFetchComponentDataArgs(
  specs: ComponentLookupSpec[],
  opts?: FetchComponentDataOpts
): { specs: ComponentLookupSpec[]; opts?: FetchComponentDataOpts };
function parseFetchComponentDataArgs(...specs: ComponentLookupSpec[]): {
  specs: ComponentLookupSpec[];
  opts?: FetchComponentDataOpts;
};
function parseFetchComponentDataArgs(...args: any[]) {
  let specs: ComponentLookupSpec[];
  let opts: FetchComponentDataOpts | undefined;
  if (Array.isArray(args[0])) {
    specs = args[0];
    opts = args[1];
  } else {
    specs = args;
    opts = undefined;
  }
  return { specs, opts };
}

/** Subset of loader functionality that works on Client and React Server Components. */
export abstract class BaseInternalPlasmicComponentLoader {
  public readonly opts: InitOptions;
  private readonly registry = new Registry();
  private readonly fetcher: PlasmicModulesFetcher;
  private readonly onBundleMerged?: () => void;
  private readonly onBundleFetched?: () => void;
  private globalVariants: GlobalVariantSpec[] = [];
  private subs: ComponentSubstitutionSpec[] = [];

  private bundle: LoaderBundleOutput = {
    modules: {
      browser: [],
      server: [],
    },
    components: [],
    globalGroups: [],
    projects: [],
    activeSplits: [],
    bundleKey: null,
    deferChunksByDefault: false,
    disableRootLoadingBoundaryByDefault: false,
    filteredIds: {},
  };

  constructor(args: {
    opts: InitOptions;
    fetcher: PlasmicModulesFetcher;
    /** Called after `mergeBundle` (including `fetch` calls). */
    onBundleMerged?: () => void;
    /** Called after any `fetch` calls. */
    onBundleFetched?: () => void;
    builtinModules: BuiltinRegisteredModules;
  }) {
    this.opts = args.opts;
    this.fetcher = args.fetcher;
    this.onBundleMerged = args.onBundleMerged;
    this.onBundleFetched = args.onBundleFetched;
    this.registerModules(args.builtinModules);
  }

  private maybeGetCompMetas(...specs: ComponentLookupSpec[]) {
    const found = new Set<ComponentMeta>();
    const missing: ComponentLookupSpec[] = [];
    for (const spec of specs) {
      const filteredMetas = getCompMetas(this.bundle.components, spec);
      if (filteredMetas.length > 0) {
        filteredMetas.forEach((meta) => found.add(meta));
      } else {
        missing.push(spec);
      }
    }
    return { found: Array.from(found.keys()), missing };
  }

  async maybeFetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData | null>;
  async maybeFetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData | null>;
  async maybeFetchComponentData(
    ...args: any[]
  ): Promise<ComponentRenderData | null> {
    const { specs, opts } = parseFetchComponentDataArgs(...args);
    const returnWithSpecsToFetch = async (
      specsToFetch: ComponentLookupSpec[]
    ) => {
      await this.fetchMissingData({ missingSpecs: specsToFetch });
      const { found: existingMetas2, missing: missingSpecs2 } =
        this.maybeGetCompMetas(...specs);
      if (missingSpecs2.length > 0) {
        return null;
      }

      return prepComponentData(this.bundle, existingMetas2, opts);
    };

    if (this.opts.alwaysFresh) {
      // If alwaysFresh, then we treat all specs as missing
      return await returnWithSpecsToFetch(specs);
    }

    // Else we only fetch actually missing specs
    const { found: existingMetas, missing: missingSpecs } =
      this.maybeGetCompMetas(...specs);
    if (missingSpecs.length === 0) {
      return prepComponentData(this.bundle, existingMetas, opts);
    }

    return await returnWithSpecsToFetch(missingSpecs);
  }

  async fetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData>;
  async fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData>;
  async fetchComponentData(...args: any[]): Promise<ComponentRenderData> {
    const { specs, opts } = parseFetchComponentDataArgs(...args);
    const data = await this.maybeFetchComponentData(specs, opts);

    if (!data) {
      const { missing: missingSpecs } = this.maybeGetCompMetas(...specs);
      throw new Error(
        `Unable to find components ${missingSpecs
          .map(getLookupSpecName)
          .join(", ")}`
      );
    }

    return data;
  }

  async fetchPages(opts?: FetchPagesOpts) {
    this.maybeReportClientSideFetch(
      () => `Plasmic: fetching all page metadata in the browser`
    );
    const data = await this.fetchAllData();
    return data.components.filter(
      (comp) =>
        comp.isPage &&
        comp.path &&
        (opts?.includeDynamicPages || !isDynamicPagePath(comp.path))
    ) as PageMeta[];
  }

  async fetchComponents() {
    this.maybeReportClientSideFetch(
      () => `Plasmic: fetching all component metadata in the browser`
    );
    const data = await this.fetchAllData();
    return data.components;
  }

  getActiveSplits() {
    return this.bundle.activeSplits;
  }

  getChunksUrl(bundle: LoaderBundleOutput, modules: CodeModule[]) {
    return this.fetcher.getChunksUrl(bundle, modules);
  }

  private async fetchMissingData(opts: {
    missingSpecs: ComponentLookupSpec[];
  }) {
    // TODO: do better than just fetching everything
    this.maybeReportClientSideFetch(
      () =>
        `Plasmic: fetching missing components in the browser: ${opts.missingSpecs
          .map((spec) => getLookupSpecName(spec))
          .join(", ")}`
    );
    return this.fetchAllData();
  }

  private maybeReportClientSideFetch(mkMsg: () => string) {
    if (isBrowser && this.opts.onClientSideFetch) {
      const msg = mkMsg();
      if (this.opts.onClientSideFetch === "warn") {
        console.warn(msg);
      } else {
        throw new Error(msg);
      }
    }
  }

  private async fetchAllData() {
    const bundle = await this.fetcher.fetchAllData();
    this.mergeBundle(bundle);
    this.onBundleFetched?.();
    return bundle;
  }

  mergeBundle(newBundle: LoaderBundleOutput) {
    newBundle.bundleKey = newBundle.bundleKey ?? null;
    if (
      newBundle.bundleKey &&
      this.bundle.bundleKey &&
      newBundle.bundleKey !== this.bundle.bundleKey
    ) {
      console.warn(
        `Plasmic Error: Different code export hashes. This can happen if your app is using different loaders with different project IDs or project versions.
Conflicting values:
${newBundle.bundleKey}
${this.bundle.bundleKey}`
      );
    }
    // Merge the old bundle into the new bundle, this way
    // the new bundle will enforce the latest data from the server
    // allowing elements to be deleted by newer bundles
    this.bundle = mergeBundles(newBundle, this.bundle);

    this.onBundleMerged?.();
  }

  getBundle(): LoaderBundleOutput {
    return this.bundle;
  }

  clearCache() {
    this.bundle = {
      modules: {
        browser: [],
        server: [],
      },
      components: [],
      globalGroups: [],
      projects: [],
      activeSplits: [],
      bundleKey: null,
      deferChunksByDefault: false,
      disableRootLoadingBoundaryByDefault: false,
      filteredIds: {},
    };
    this.registry.clear();
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

  protected internalSubstituteComponent<P>(
    component: React.ComponentType<P>,
    name: ComponentLookupSpec,
    codeComponentHelpers:
      | InternalCodeComponentHelpers<
          React.ComponentProps<React.ComponentType<P>>
        >
      | undefined
  ) {
    if (!this.isRegistryEmpty()) {
      console.warn(
        "Calling PlasmicComponentLoader.registerSubstitution() after Plasmic component has rendered; starting over."
      );
      this.clearRegistry();
    }
    this.subs.push({ lookup: name, component, codeComponentHelpers });
  }

  abstract registerComponent<T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ): void;
  abstract registerFunction<F extends (...args: any[]) => any>(
    fn: F,
    meta: CustomFunctionMeta<F>
  ): void;
  abstract registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ): void;
  abstract registerTrait(trait: string, meta: TraitMeta): void;
  abstract registerToken(token: TokenRegistration): void;

  protected refreshRegistry() {
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

    this.registry.updateModules(this.getBundle());
  }

  isRegistryEmpty() {
    return this.registry.isEmpty();
  }

  clearRegistry() {
    this.registry.clear();
  }

  setGlobalVariants(globalVariants: GlobalVariantSpec[]) {
    this.globalVariants = globalVariants;
  }

  getGlobalVariants() {
    return this.globalVariants;
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
        this.mergeBundle(cachedBundle);
      }
    }
    this.mergeBundle(bundle);
  }

  getLookup() {
    return new ComponentLookup(this.getBundle(), this.registry);
  }

  trackConversion(_value = 0) {
    // no-op: tracking removed from loader packages
  }

  public async getActiveVariation(
    opts: Omit<Parameters<typeof getActiveVariation>[0], "splits">
  ) {
    await this.fetchComponents();
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

  public trackRender(_opts?: TrackRenderOptions) {
    // no-op: tracking removed from loader packages
  }

  public loadServerQueriesModule(fileName: string) {
    return this.registry.load(fileName);
  }
}

/**
 * Library for fetching component data, and registering
 * custom components.
 */
export class PlasmicComponentLoader {
  private __internal: BaseInternalPlasmicComponentLoader;

  constructor(internal: BaseInternalPlasmicComponentLoader) {
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
  fetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData>;
  fetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData>;
  fetchComponentData(...args: any[]): Promise<ComponentRenderData> {
    return this.__internal.fetchComponentData(...args);
  }

  /**
   * Like fetchComponentData(), but returns null instead of throwing an Error
   * when a component is not found.  Useful when you are implementing a catch-all
   * page and want to check if a specific path had been defined for Plasmic.
   */
  async maybeFetchComponentData(
    ...specs: ComponentLookupSpec[]
  ): Promise<ComponentRenderData | null>;
  async maybeFetchComponentData(
    specs: ComponentLookupSpec[],
    opts?: FetchComponentDataOpts
  ): Promise<ComponentRenderData | null>;
  async maybeFetchComponentData(
    ...args: any[]
  ): Promise<ComponentRenderData | null> {
    return this.__internal.maybeFetchComponentData(...args);
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

  protected async _getActiveVariation(
    opts: Parameters<typeof this.__internal.getActiveVariation>[0]
  ) {
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

  getExecFuncModule(
    renderData: ComponentRenderData,
    fileNameKey:
      | "serverQueriesExecFuncFileName"
      | "generateMetadataFuncFileName"
  ) {
    if (renderData.entryCompMetas.length === 0) {
      return undefined;
    }

    const fileName = renderData.entryCompMetas[0][fileNameKey];

    if (!fileName) {
      return undefined;
    }
    return this.__internal.loadServerQueriesModule(fileName);
  }

  async unstable__getServerQueriesData(
    renderData: ComponentRenderData,
    $ctx: Record<string, any>
  ) {
    const module = this.getExecFuncModule(
      renderData,
      "serverQueriesExecFuncFileName"
    );

    try {
      const $serverQueries = await module?.executeServerQueries($ctx);
      return $serverQueries;
    } catch (err) {
      console.error("Error executing server queries function", err);
      return {};
    }
  }

  async unstable__generateMetadata(
    renderData: ComponentRenderData,
    props: {
      params: Promise<ParamsRecord> | ParamsRecord;
      query: Promise<ParamsRecord> | ParamsRecord;
    }
  ) {
    const module = this.getExecFuncModule(
      renderData,
      "generateMetadataFuncFileName"
    );
    const fallback = renderData.entryCompMetas[0]?.pageMetadata || {};
    if (!module) {
      return fallback;
    }

    try {
      const metadata = await module.generateMetadata(props);
      return metadata;
    } catch (err) {
      return fallback;
    }
  }
}
