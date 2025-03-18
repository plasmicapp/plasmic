import unfetch from "@plasmicapp/isomorphic-unfetch";

export interface ComponentMeta {
  id: string;
  usedComponents: string[];
  projectId: string;
  name: string;
  displayName: string;
  cssFile: string;
  path: string | undefined;
  isPage: boolean;
  plumeType?: string;
  entry: string;
  isCode: boolean;
  isGlobalContextProvider: boolean;
  pageMetadata?: PageMetadata;
  metadata?: Record<string, string>;
  serverQueriesExecFuncFileName?: string;
}

export interface PageMeta extends ComponentMeta {
  isPage: true;
  path: string;
  plumeType: never;
  pageMetadata: PageMetadata;
}

export interface PageMetadata {
  path: string;
  title?: string | null;
  description?: string | null;
  openGraphImageUrl?: string | null;
  canonical?: string | null;
}

export interface GlobalGroupMeta {
  id: string;
  projectId: string;
  name: string;
  type: string;
  contextFile: string;
  useName: string;
}

export interface ProjectMeta {
  id: string;
  teamId?: string;
  indirect?: boolean;
  name: string;
  version: string;
  remoteFonts: FontMeta[];
  globalContextsProviderFileName: string;
}

export interface FontMeta {
  url: string;
}

interface GlobalVariantSplitContent {
  type: "global-variant";
  projectId: string;
  group: string;
  variant: string;
}

interface Slice {
  id: string;
  contents: GlobalVariantSplitContent[];
  externalId?: string;
}

export interface ExperimentSlice extends Slice {
  prob: number;
}

export interface SegmentSlice extends Slice {
  cond: any;
}

interface BareSplit {
  id: string;
  projectId: string;
  name: string;
  externalId?: string;
  description?: string;
  pagesPaths: string[];
}

export interface ExperimentSplit extends BareSplit {
  type: "experiment";
  slices: ExperimentSlice[];
}

export interface SegmentSplit extends BareSplit {
  type: "segment";
  slices: SegmentSlice[];
}

export type Split = ExperimentSplit | SegmentSplit;

interface ApiLoaderBundleOutput {
  modules: {
    browser: (CodeModule | AssetModule)[];
    server: (CodeModule | AssetModule)[];
  };
  components: ComponentMeta[];
  globalGroups: GlobalGroupMeta[];
  projects: ProjectMeta[];
  activeSplits: Split[];
  bundleKey: string | null;
  deferChunksByDefault: boolean;
  disableRootLoadingBoundaryByDefault: boolean;
}

export interface LoaderBundleOutput extends ApiLoaderBundleOutput {
  // A map from project ID to the list of component IDs that are not included in the bundle
  // this is used to know which components exist in the project, which allow us to properly
  // handle bundle merging being aware of the deleted components.
  filteredIds: Record<string, string[]>;
}

export interface LoaderHtmlOutput {
  html: string;
}

export interface CodeModule {
  fileName: string;
  code: string;
  imports: string[];
  type: "code";
}

export interface AssetModule {
  fileName: string;
  source: string;
  type: "asset";
}

const VERSION = "10";

export const isBrowser =
  typeof window !== "undefined" &&
  window != null &&
  typeof window.document !== "undefined";

export function transformApiLoaderBundleOutput(
  bundle: ApiLoaderBundleOutput
): LoaderBundleOutput {
  return {
    ...bundle,
    filteredIds: Object.fromEntries(bundle.projects.map((p) => [p.id, []])),
  };
}

export class Api {
  private host: string;
  private fetch: typeof globalThis.fetch;

  private lastResponse:
    | {
        bundle: LoaderBundleOutput;
        key: string;
      }
    | undefined = undefined;

  constructor(
    private opts: {
      projects: { id: string; token: string }[];
      host?: string;
      nativeFetch?: boolean;
      manualRedirect?: boolean;
    }
  ) {
    this.host = opts.host ?? "https://codegen.plasmic.app";
    this.fetch = (
      opts.nativeFetch && globalThis.fetch ? globalThis.fetch : unfetch
    ).bind(globalThis);
  }

  async fetchLoaderData(
    projectIds: string[],
    opts: {
      platform?: "react" | "nextjs" | "gatsby";
      platformOptions?: {
        nextjs?: {
          appDir: boolean;
        };
      };
      preview?: boolean;
      browserOnly?: boolean;
      i18nKeyScheme?: "content" | "hash" | "path";
      i18nTagPrefix?: string;
      skipHead?: boolean;
    }
  ): Promise<LoaderBundleOutput> {
    const { platform, preview } = opts;
    const query = new URLSearchParams([
      ["platform", platform ?? "react"],
      ...(opts.platformOptions?.nextjs?.appDir
        ? [["nextjsAppDir", "true"]]
        : []),
      ...projectIds.map((projectId) => ["projectId", projectId]),
      ...(opts.browserOnly ? [["browserOnly", "true"]] : []),
      ...(opts.i18nKeyScheme ? [["i18nKeyScheme", opts.i18nKeyScheme]] : []),
      ...(opts.i18nTagPrefix ? [["i18nTagPrefix", opts.i18nTagPrefix]] : []),
      ...(opts.skipHead ? [["skipHead", "true"]] : []),
    ]).toString();

    const url = `${this.host}/api/v1/loader/code/${
      preview ? "preview" : "published"
    }?${query}`;

    // We only expect a redirect when we're dealing with published mode, as there should be
    // a stable set of versions to be used. As in browser, we could receive a opaque response
    // with a redirect, we don't try to use last response in browser.
    const useLastReponse =
      // We consider that manualRedirect is true by default, only by setting it to false
      // we disable it.
      !(this.opts.manualRedirect === false) && !preview && !isBrowser;

    if (useLastReponse) {
      const redirectResp = await this.fetch(url, {
        method: "GET",
        headers: this.makeGetHeaders(),
        redirect: "manual",
      });

      if (redirectResp.status !== 301 && redirectResp.status !== 302) {
        const error = await this.parseJsonResponse(redirectResp);
        throw new Error(
          `Error fetching loader data, a redirect was expected: ${
            error?.error?.message ?? redirectResp.statusText
          }`
        );
      }

      const nextLocation = redirectResp.headers.get("location");
      if (!nextLocation) {
        throw new Error(
          `Error fetching loader data, a redirect was expected but no location header was found`
        );
      }

      if (this.lastResponse?.key === nextLocation) {
        return this.lastResponse.bundle;
      }

      const resp = await this.fetch(`${this.host}${nextLocation}`, {
        method: "GET",
        headers: this.makeGetHeaders(),
      });

      if (resp.status >= 400) {
        const error = await this.parseJsonResponse(resp);
        throw new Error(
          `Error fetching loader data: ${
            error?.error?.message ?? resp.statusText
          }`
        );
      }

      const json = transformApiLoaderBundleOutput(
        (await this.parseJsonResponse(resp)) as ApiLoaderBundleOutput
      );
      this.lastResponse = {
        bundle: json,
        key: nextLocation,
      };

      return json;
    }

    const resp = await this.fetch(url, {
      method: "GET",
      headers: this.makeGetHeaders(),
    });
    if (resp.status >= 400) {
      const error = await this.parseJsonResponse(resp);
      throw new Error(
        `Error fetching loader data: ${
          error?.error?.message ?? resp.statusText
        }`
      );
    }
    const json = await this.parseJsonResponse(resp);
    return transformApiLoaderBundleOutput(json as ApiLoaderBundleOutput);
  }

  private async parseJsonResponse(resp: Response) {
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Error parsing JSON response: ${err}; status: ${resp.status}; response: ${text}`
      );
    }
  }

  async fetchHtmlData(opts: {
    projectId: string;
    component: string;
    hydrate?: boolean;
    embedHydrate?: boolean;
  }) {
    const { projectId, component, embedHydrate, hydrate } = opts;
    const query = new URLSearchParams([
      ["projectId", projectId],
      ["component", component],
      ["embedHydrate", embedHydrate ? "1" : "0"],
      ["hydrate", hydrate ? "1" : "0"],
    ]).toString();
    const resp = await this.fetch(`${this.host}/api/v1/loader/html?${query}`, {
      method: "GET",
      headers: this.makeGetHeaders(),
    });
    const json = await resp.json();
    return json as LoaderHtmlOutput;
  }

  private makeGetHeaders() {
    return {
      "x-plasmic-loader-version": VERSION,
      ...this.makeAuthHeaders(),
    };
  }

  private makeAuthHeaders() {
    const tokens = this.opts.projects
      .map((p) => `${p.id}:${p.token}`)
      .join(",");
    return {
      "x-plasmic-api-project-tokens": tokens,
    };
  }

  getChunksUrl(bundle: LoaderBundleOutput, modules: CodeModule[]) {
    return `${this.host}/api/v1/loader/chunks?bundleKey=${encodeURIComponent(
      bundle.bundleKey ?? "null"
    )}&fileName=${encodeURIComponent(
      modules
        .map((m) => m.fileName)
        .sort()
        .join(",")
    )}`;
  }
}
