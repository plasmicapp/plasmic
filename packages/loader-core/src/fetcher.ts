import { Api, isBrowser, LoaderBundleOutput } from './api';

interface FetcherOptions {
  projects: {
    id: string;
    version?: string;
    token: string;
  }[];
  cache?: LoaderBundleCache;
  platform?: 'react' | 'nextjs' | 'gatsby';
  preview?: boolean;
  host?: string;
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
        p.version && !this.opts.preview ? `${p.id}@${p.version}` : p.id
      ),
      {
        platform: this.opts.platform,
        preview: this.opts.preview,
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
}
