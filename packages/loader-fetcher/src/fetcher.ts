import { Api, CodeModule, isBrowser, LoaderBundleOutput } from "./api";

export interface FetcherOptions {
  projects: {
    id: string;
    version?: string;
    token: string;
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
  /**
   * @deprecated use i18n.keyScheme instead
   */
  i18nKeyScheme?: "content" | "hash" | "path";
  i18n?: {
    keyScheme: "content" | "hash" | "path";
    tagPrefix?: string;
  };
  skipHead?: boolean;
  nativeFetch?: boolean;
  manualRedirect?: boolean;
}

export interface LoaderBundleCache {
  set: (data: LoaderBundleOutput) => Promise<void>;
  get: () => Promise<LoaderBundleOutput>;
}

export class PlasmicModulesFetcher {
  private api: Api;
  private curFetch: Promise<LoaderBundleOutput> | undefined = undefined;
  constructor(private opts: FetcherOptions) {
    this.api = new Api({
      projects: opts.projects,
      host: opts.host,
      nativeFetch: opts.nativeFetch,
      manualRedirect: opts.manualRedirect,
    });
  }

  getChunksUrl(bundle: LoaderBundleOutput, modules: CodeModule[]) {
    return this.api.getChunksUrl(bundle, modules);
  }

  async fetchAllData() {
    // getCachedOrFetched uses a cache defined by the user.
    const bundle = await this.getCachedOrFetch();

    // For React Server Components (Next.js 13+),
    // we need to pass server modules in LoaderBundleOutput from Server Components to Client Components.
    // We don't want to pass them via normal page props because that will be serialized to the browser.
    // Instead, we pass the bundle (including the server modules) via the Node `global` variable.
    //
    // cacheBundleInNodeServer caches a bundle in the Node server process.
    this.cacheBundleInNodeServer(bundle);

    return bundle;
  }

  private async getCachedOrFetch() {
    if (this.opts.cache) {
      const cachedData = await this.opts.cache.get();
      if (cachedData) {
        return cachedData;
      }
    }
    if (this.curFetch) {
      return await this.curFetch;
    }
    if (typeof process === "undefined" || !process.env?.PLASMIC_QUIET) {
      console.debug("Plasmic: doing a fresh fetch...");
    }
    this.curFetch = this.doFetch();
    const data = await this.curFetch;
    this.curFetch = undefined;
    return data;
  }

  private async doFetch() {
    const data = await this.api.fetchLoaderData(
      this.opts.projects.map((p) =>
        p.version ? `${p.id}@${p.version}` : p.id
      ),
      {
        platform: this.opts.platform,
        platformOptions: this.opts.platformOptions,
        preview: this.opts.preview,
        i18nKeyScheme: this.opts.i18n?.keyScheme ?? this.opts.i18nKeyScheme,
        i18nTagPrefix: this.opts.i18n?.tagPrefix,
        browserOnly: isBrowser,
        skipHead: this.opts.skipHead,
      }
    );
    if (this.opts.cache) {
      await this.opts.cache.set(data);
    }
    if (typeof process === "undefined" || !process.env?.PLASMIC_QUIET) {
      console.debug(
        `Plasmic: fetched designs for ${data.projects
          .map((p) => `"${p.name}" (${p.id}@${p.version})`)
          .join(", ")}`
      );
    }
    return data;
  }

  private cacheBundleInNodeServer(bundle: LoaderBundleOutput) {
    if (isBrowser) {
      return;
    }

    const global = globalThis as GlobalWithBundles;
    if (global.__PLASMIC_BUNDLES === undefined) {
      global.__PLASMIC_BUNDLES = {};
    }
    global.__PLASMIC_BUNDLES[getBundleKey(this.opts)] = bundle;
  }
}

export function internal_getCachedBundleInNodeServer(
  opts: FetcherOptions
): LoaderBundleOutput | undefined {
  if (isBrowser) {
    throw new Error(`Should not be consulting Node server cache in browser`);
  }

  const global = globalThis as GlobalWithBundles;
  return global.__PLASMIC_BUNDLES?.[getBundleKey(opts)];
}

function getBundleKey({
  host,
  platform,
  i18nKeyScheme,
  preview,
  projects,
  skipHead,
}: FetcherOptions) {
  return JSON.stringify({
    host,
    platform,
    i18nKeyScheme,
    preview,
    projects,
    skipHead,
  });
}

interface GlobalWithBundles {
  __PLASMIC_BUNDLES?: { [bundleKey: string]: LoaderBundleOutput };
}
