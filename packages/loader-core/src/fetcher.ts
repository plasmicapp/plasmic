import { Api, LoaderBundleOutput } from './api';

export interface InitOptions {
  user: string;
  token: string;
  projectIds: string[];
  cache?: LoaderBundleCache;
}

interface FetcherOptions {
  user: string;
  token: string;
  projectIds: string[];
  cache?: LoaderBundleCache;
  platform?: 'react' | 'nextjs' | 'gatsby';
}

export interface LoaderBundleCache {
  set: (data: LoaderBundleOutput) => Promise<void>;
  get: () => Promise<LoaderBundleOutput>;
}

export class PlasmicModulesFetcher {
  private api: Api;
  private curFetch: Promise<LoaderBundleOutput> | undefined = undefined;
  constructor(private opts: FetcherOptions) {
    this.api = new Api(opts);
  }

  async fetchAllData() {
    if (this.opts.cache) {
      const cachedData = await this.opts.cache.get();
      if (cachedData) {
        console.log('Using cached data');
        return cachedData;
      }
    }
    if (this.curFetch) {
      console.log('Awaiting in-process fetch');
      return await this.curFetch;
    }
    console.log('Doing a fresh fetch...');
    this.curFetch = this.doFetch();
    return await this.curFetch;
  }

  private async doFetch() {
    const data = await this.api.fetchLoaderData(this.opts.projectIds, {
      platform: this.opts.platform,
    });
    if (this.opts.cache) {
      await this.opts.cache.set(data);
    }
    console.log('Finished fresh fetch');
    return data;
  }
}
