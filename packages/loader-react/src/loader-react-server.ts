import {
  LoaderBundleCache,
  PageMeta,
  PlasmicModulesFetcher,
  PlasmicTracker,
} from "@plasmicapp/loader-core";
import {
  CodeModule,
  ComponentMeta,
  LoaderBundleOutput,
} from "@plasmicapp/loader-fetcher";
import { prepComponentData } from "./bundles";
import { ComponentRenderData, FetchPagesOpts } from "./loader";
import {
  ComponentLookupSpec,
  getCompMetas,
  getLookupSpecName,
  isBrowser,
  isDynamicPagePath,
} from "./utils";

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
  host?: string;
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

/** Subset of loader functionality that works on React Server Components. */
export class ReactServerPlasmicComponentLoader {
  private readonly opts: InitOptions;
  private readonly fetcher: PlasmicModulesFetcher;
  private readonly tracker: PlasmicTracker;
  private readonly onBundleMerged?: () => void;
  private readonly onBundleFetched?: () => void;

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
    bundleUrlQuery: null,
  };

  constructor(args: {
    opts: InitOptions;
    fetcher: PlasmicModulesFetcher;
    tracker: PlasmicTracker;
    /** Called after `mergeBundle` (including `fetch` calls). */
    onBundleMerged?: () => void;
    /** Called after any `fetch` calls. */
    onBundleFetched?: () => void;
  }) {
    this.opts = args.opts;
    this.fetcher = args.fetcher;
    this.tracker = args.tracker;
    this.onBundleMerged = args.onBundleMerged;
    this.onBundleFetched = args.onBundleFetched;
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
    this.tracker.trackFetch();
    this.mergeBundle(bundle);
    this.onBundleFetched?.();
    return bundle;
  }

  mergeBundle(bundle: LoaderBundleOutput) {
    // TODO: this is only possible as the bundle is the full bundle,
    // not a partial bundle. Figure it out how to merge partial bundles.
    this.bundle = bundle;
    // Avoid `undefined` as it cannot be serialized as JSON
    this.bundle.bundleUrlQuery = this.bundle.bundleUrlQuery ?? null;
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
      external: [],
      projects: [],
      activeSplits: [],
      bundleUrlQuery: null,
    };
  }
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
