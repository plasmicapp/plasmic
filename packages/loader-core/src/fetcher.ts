import { Api, LoaderBundleOutput } from './api';

interface FetcherOptions {
  user: string;
  token: string;
  projects: {
    id: string;
    version?: string;
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
      user: opts.user,
      token: opts.token,
      host: opts.host,
    });
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
    const data = await this.api.fetchLoaderData(
      this.opts.projects.map((p) =>
        p.version && !this.opts.preview ? `${p.id}@${p.version}` : p.id
      ),
      {
        platform: this.opts.platform,
        preview: this.opts.preview,
      }
    );
    if (this.opts.cache) {
      await this.opts.cache.set(data);
    }
    console.log('Finished fresh fetch');
    return data;
  }
}
