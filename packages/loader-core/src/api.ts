import fetch from 'isomorphic-fetch';

export interface ComponentMeta {
  id: string;
  projectId: string;
  name: string;
  renderFile: string;
  skeletonFile: string;
  path: string | undefined;
  isPage: boolean;
  plumeType?: string;
  entry: string;
}

export interface PageMeta extends ComponentMeta {
  isPage: true;
  path: string;
  plumeType: never;
}

export interface GlobalGroupMeta {
  id: string;
  projectId: string;
  name: string;
  type: string;
  contextFile: string;
  useName: string;
}

export interface LoaderBundleOutput {
  modules: (CodeModule | AssetModule)[];
  external: string[];
  components: ComponentMeta[];
  globalGroups: GlobalGroupMeta[];
}

export interface LoaderHtmlOutput {
  html: string;
}

export interface CodeModule {
  fileName: string;
  code: string;
  imports: string[];
  type: 'code';
}

export interface AssetModule {
  fileName: string;
  source: string;
  type: 'asset';
}

export class Api {
  private host: string;
  constructor(
    private opts: {
      user: string;
      token: string;
      host?: string;
    }
  ) {
    this.host = opts.host ?? 'https://studio.plasmic.app';
  }

  async fetchLoaderData(
    projectIds: string[],
    opts: {
      platform?: 'react' | 'nextjs' | 'gatsby';
      preview?: boolean;
    }
  ) {
    const { platform, preview } = opts;
    const query = new URLSearchParams([
      ['platform', platform ?? 'react'],
      ...projectIds.map((projectId) => ['projectId', projectId]),
    ]).toString();

    const url = `${this.host}/api/v1/loader/code/${
      preview ? 'preview' : 'published'
    }?${query}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: this.makeGetHeaders(),
    });
    if (resp.status >= 400) {
      throw new Error(resp.statusText);
    }
    const json = await resp.json();
    return json as LoaderBundleOutput;
  }

  async fetchHtmlData(opts: {
    projectId: string;
    component: string;
    hydrate?: boolean;
    embedHydrate?: boolean;
  }) {
    const { projectId, component, embedHydrate, hydrate } = opts;
    const query = new URLSearchParams([
      ['projectId', projectId],
      ['component', component],
      ['embedHydrate', embedHydrate ? '1' : '0'],
      ['hydrate', hydrate ? '1' : '0'],
    ]).toString();
    const resp = await fetch(`${this.host}/api/v1/loader/html?${query}`, {
      method: 'GET',
      headers: this.makeGetHeaders(),
    });
    const json = await resp.json();
    return json as LoaderHtmlOutput;
  }

  private makeGetHeaders() {
    return {
      ...this.makeAuthHeaders(),
    };
  }

  // @ts-ignore
  private makePostHeaders() {
    return {
      'Content-Type': 'application/json',
      ...this.makeAuthHeaders(),
    };
  }

  private makeAuthHeaders() {
    return {
      'x-plasmic-api-user': this.opts.user,
      'x-plasmic-api-token': this.opts.token,
    };
  }
}
