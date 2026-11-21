import type { AssetModule, CodeModule } from "./runtime-types";

export type { AssetModule, CodeModule };

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

// Keep in sync with platform/wab ProjectMeta
export interface ProjectMeta {
  id: string;
  teamId?: string;
  indirect: boolean;
  name: string;
  version: string;
  remoteFonts: FontMeta[];
  hasStyleTokenOverrides: boolean;
  styleTokensProviderFileName: string;
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
  redirectUrl?: string;
}

export interface LoaderBundleOutput extends ApiLoaderBundleOutput {
  // A map from project ID to the list of component IDs that are not included in the bundle
  // this is used to know which components exist in the project, which allow us to properly
  // handle bundle merging being aware of the deleted components.
  filteredIds: Record<string, string[]>;
}

const VERSION = "10";

export const isBrowser =
  typeof window !== "undefined" &&
  window != null &&
  typeof window.document !== "undefined";

export function transformApiLoaderBundleOutput(
  bundle: ApiLoaderBundleOutput,
): LoaderBundleOutput {
  return {
    ...bundle,
    filteredIds: Object.fromEntries(bundle.projects.map((p) => [p.id, []])),
  };
}

const DEFAULT_CDN_HOST = "https://codegen.plasmic.app";

const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);

const BROWSER_FETCH_FAILED = Symbol("BROWSER_FETCH_FAILED");
const ROUTE_NOT_FOUND = Symbol("ROUTE_NOT_FOUND");

export class Api {
  private readonly previewHost: string;
  private readonly cdnHost: string;
  private fetch: typeof globalThis.fetch;

  private useLegacyPreview = false;

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
      apiHost?: string;
      cdnHost?: string;
      /** @deprecated No-op. Native fetch is always used now. */
      nativeFetch?: boolean;
      manualRedirect?: boolean;
    },
  ) {
    this.cdnHost = opts.cdnHost ?? opts.host ?? DEFAULT_CDN_HOST;
    this.previewHost = opts.apiHost ?? opts.host ?? this.cdnHost;
    this.fetch = globalThis.fetch.bind(globalThis);
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
      /** Watcher revisions bypass cached redirects to older previews. */
      minRevs?: Record<string, number>;
    },
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
      ...(preview ? [["loaderVersion", VERSION]] : []),
      ...(preview && opts.minRevs
        ? Object.entries(opts.minRevs)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([projectId, rev]) => ["minRev", `${projectId}:${rev}`])
        : []),
    ]).toString();

    if (!preview) {
      const host = this.cdnHost;
      return this.fetchFromRoute(
        host,
        `${host}/api/v1/loader/code/published?${query}`,
        { preview: false },
      );
    }

    const host = this.previewHost;
    const legacyUrl = `${host}/api/v1/loader/code/preview?${query}`;
    if (this.useLegacyPreview) {
      return this.fetchFromRoute(host, legacyUrl, { preview: true });
    }
    const result = await this.fetchFromRoute(
      host,
      `${host}/api/v1/loader/code/revision/latest?${query}`,
      { preview: true, allowRouteNotFound: true },
    );
    if (result !== ROUTE_NOT_FOUND && result !== BROWSER_FETCH_FAILED) {
      return result;
    }
    const bundle = await this.fetchFromRoute(host, legacyUrl, {
      preview: true,
    });
    // A browser network error can be temporary. Only remember a confirmed 404.
    if (result === ROUTE_NOT_FOUND) {
      this.useLegacyPreview = true;
    }
    return bundle;
  }

  private async fetchFromRoute(
    host: string,
    url: string,
    opts: { preview: boolean; allowRouteNotFound?: false },
  ): Promise<LoaderBundleOutput>;
  private async fetchFromRoute(
    host: string,
    url: string,
    opts: { preview: boolean; allowRouteNotFound: true },
  ): Promise<
    LoaderBundleOutput | typeof ROUTE_NOT_FOUND | typeof BROWSER_FETCH_FAILED
  >;
  private async fetchFromRoute(
    host: string,
    url: string,
    opts: { preview: boolean; allowRouteNotFound?: boolean },
  ): Promise<
    LoaderBundleOutput | typeof ROUTE_NOT_FOUND | typeof BROWSER_FETCH_FAILED
  > {
    const { preview, allowRouteNotFound } = opts;

    // Browsers hide manual redirect targets. Node can reuse the last bundle by URL.
    const useManualRedirect = this.opts.manualRedirect !== false && !isBrowser;

    if (useManualRedirect) {
      const redirectResp = await this.fetch(url, {
        method: "GET",
        headers: this.makeGetHeaders(),
        redirect: "manual",
      });

      if (allowRouteNotFound && redirectResp.status === 404) {
        return ROUTE_NOT_FOUND;
      }

      if (!REDIRECT_STATUSES.has(redirectResp.status)) {
        if (preview) {
          return this.handleBundleResponse(redirectResp, host);
        }
        const error = await this.parseJsonResponse(redirectResp);
        throw new Error(
          `Error fetching loader data, a redirect was expected: ${
            error?.error?.message ?? redirectResp.statusText
          }`,
        );
      }

      const location = redirectResp.headers.get("location");
      if (!location) {
        throw new Error(
          `Error fetching loader data, a redirect was expected but no location header was found`,
        );
      }

      // Resolve before caching so relative locations are scoped to their host.
      const nextUrl = new URL(location, url).toString();
      if (this.lastResponse?.key === nextUrl) {
        return this.lastResponse.bundle;
      }

      const resp = await this.fetch(nextUrl, {
        method: "GET",
        headers: this.makeGetHeaders(),
      });

      const json = transformApiLoaderBundleOutput(
        await this.verifyAndParseJsonResponse(resp),
      );
      this.lastResponse = {
        bundle: json,
        key: nextUrl,
      };

      return json;
    }

    let resp: Response;
    try {
      resp = await this.fetch(url, {
        method: "GET",
        headers: this.makeGetHeaders(),
      });
    } catch (error) {
      // Browsers reject fetch with TypeError when an older host omits CORS on its 404.
      if (isBrowser && allowRouteNotFound && error instanceof TypeError) {
        return BROWSER_FETCH_FAILED;
      }
      throw error;
    }

    // A followed redirect can return 404 for a missing revision.
    if (allowRouteNotFound && resp.status === 404 && !resp.redirected) {
      return ROUTE_NOT_FOUND;
    }

    return this.handleBundleResponse(resp, host);
  }

  private async handleBundleResponse(resp: Response, host: string) {
    let json = await this.verifyAndParseJsonResponse(resp);

    // An Angular polyfill can cause 302 redirects to fail in Safari, due to missing headers.
    // This 200 response with `redirectUrl` is a workaround for specific projects that need it.
    if (json.redirectUrl) {
      const redirectResp = await this.fetch(`${host}${json.redirectUrl}`, {
        method: "GET",
        headers: this.makeGetHeaders(),
      });
      json = await this.verifyAndParseJsonResponse(redirectResp);
    }

    return transformApiLoaderBundleOutput(json);
  }

  private async verifyAndParseJsonResponse(
    resp: Response,
    errorText = "Error fetching loader data",
  ) {
    if (resp.status >= 400) {
      const error = await this.parseJsonResponse(resp);
      throw new Error(
        `${errorText}: ${error?.error?.message ?? resp.statusText}`,
      );
    }
    return (await this.parseJsonResponse(resp)) as ApiLoaderBundleOutput;
  }

  private async parseJsonResponse(resp: Response) {
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Error parsing JSON response: ${err}; status: ${resp.status}; response: ${text}`,
      );
    }
  }

  private makeGetHeaders() {
    return {
      "x-plasmic-loader-version": VERSION,
      ...this.makeAuthHeaders(),
    };
  }

  private makeAuthHeaders() {
    // CDN caches key loader responses on this header, so serialize projects in
    // a canonical order: callers listing the same projects in a different
    // order then share cache entries. The sort is stable, so duplicate IDs keep
    // their relative order.
    const tokens = [...this.opts.projects]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((p) => `${p.id}:${p.token}`)
      .join(",");
    return {
      "x-plasmic-api-project-tokens": tokens,
    };
  }

  getChunksUrl(bundle: LoaderBundleOutput, modules: CodeModule[]) {
    return `${this.cdnHost}/api/v1/loader/chunks?bundleKey=${encodeURIComponent(
      bundle.bundleKey ?? "null",
    )}&fileName=${encodeURIComponent(
      modules
        .map((m) => m.fileName)
        .sort()
        .join(","),
    )}`;
  }
}
