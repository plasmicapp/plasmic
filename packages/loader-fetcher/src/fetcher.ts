import { Api, isBrowser, LoaderBundleOutput } from './api';
import { uniqueLocalId } from './uniqueLocalId';

export interface FetcherOptions {
  projects: {
    id: string;
    version?: string;
    token: string;
  }[];
  cache?: LoaderBundleCache;
  platform?: 'react' | 'nextjs' | 'gatsby';
  preview?: boolean;
  host?: string;
  i18nKeyScheme?: 'content' | 'hash';
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
    });
  }

  async fetchAllData() {
    const bundle = await this.getCachedOrFetch();

    // Assign a local ID AFTER caching. If the local ID were cached, it may no longer be unique.
    bundle.localId = uniqueLocalId();
    this.storeGlobally(bundle);

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
    console.debug('Plasmic: doing a fresh fetch...');
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
        preview: this.opts.preview,
        i18nKeyScheme: this.opts.i18nKeyScheme,
        browserOnly: isBrowser,
      }
    );
    if (this.opts.cache) {
      await this.opts.cache.set(data);
    }
    console.debug(
      `Plasmic: fetched designs for ${data.projects
        .map((p) => `"${p.name}" (${p.id}@${p.version})`)
        .join(', ')}`
    );
    return data;
  }

  // For React Server Components (Next.js 13+),
  // we need to pass server modules in LoaderBundleOutput from Server Components to Client Components.
  // We don't want to pass them via normal page props because that will be serialized to the browser.
  // Instead, we pass the bundle (including the server modules) via the Node `global` variable.
  //
  // This is the code that stores the bundle.
  private storeGlobally(bundle: LoaderBundleOutput) {
    if (bundle.localId === undefined) {
      return;
    }

    if (global.__PLASMIC_BUNDLES === undefined) {
      global.__PLASMIC_BUNDLES = {};
    }
    global.__PLASMIC_BUNDLES[bundle.localId] = bundle;
  }
}

interface GlobalWithBundles {
  __PLASMIC_BUNDLES?: { [localId: number]: LoaderBundleOutput };
}
const global = globalThis as GlobalWithBundles;
