import { Project } from "@/wab/server/entities/Entities";
import { publicCmsReadsContract } from "@/wab/shared/api/cms";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { LowerHttpMethod } from "@/wab/shared/HttpClientUtil";
import { SharedApi } from "@/wab/shared/SharedApi";
import { initClient, InitClientReturn, initContract } from "@ts-rest/core";
import { APIRequestContext, APIResponse, request } from "playwright";

interface ApiTesterRequestOptions {
  headers?: { [name: string]: string | null };
  maxRedirects?: number;
}

/** Base API tester that makes HTTP requests. Nothing domain specific here. */
export class ApiTester {
  private readonly apiRequestContextPromise: Promise<APIRequestContext>;

  constructor(
    private readonly baseURL: string,
    private readonly baseHeaders: { [name: string]: string } = {}
  ) {
    this.apiRequestContextPromise = request.newContext({
      baseURL,
    });
  }

  async req(
    method: "get" | "post" | "put" | "delete" | "patch",
    url: string,
    data?: {} | undefined,
    opts?: ApiTesterRequestOptions,
    _hideDataOnError?: boolean | undefined,
    _noErrorTransform?: boolean | undefined
  ): Promise<any> {
    const res = await this.rawReq(method, url, data, opts);
    try {
      const json = await res.json();
      console.info("HTTP response", method, url, res.status(), json);
      return json;
    } catch {
      // TODO: make a common HTTP error shared across the codebase
      const text = await res.text();
      console.info("HTTP response", method, url, res.status(), text);
      throw new Error(`${res.status()}: ${text}`);
    }
  }

  async rawReq(
    method: LowerHttpMethod,
    url: string,
    data?: {} | undefined,
    { headers, ...opts }: ApiTesterRequestOptions = {}
  ) {
    const mergedHeaders = { ...this.baseHeaders };
    Object.entries(headers ?? {}).forEach(([name, value]) => {
      if (value === null) {
        delete mergedHeaders[name];
      } else {
        mergedHeaders[name] = value;
      }
    });

    console.info("HTTP request", method, url, mergedHeaders, data);
    const apiRequestContext = await this.apiRequestContextPromise;
    return apiRequestContext.fetch(`${this.baseURL}${url}`, {
      method,
      headers: mergedHeaders,
      data,
      ...opts,
    });
  }

  async dispose() {
    const apiRequestContext = await this.apiRequestContextPromise;
    await apiRequestContext.dispose();
  }
}

/** For testing SharedApi, i.e. APIs that our app use. */
export class SharedApiTester extends SharedApi {
  readonly apiTester: ApiTester;

  constructor(baseURL: string, baseHeaders: { [name: string]: string } = {}) {
    super();
    this.apiTester = new ApiTester(baseURL, baseHeaders);
  }

  protected setUser(_user: ApiUser): void {}
  protected clearUser(): void {}

  protected async req(
    method: LowerHttpMethod,
    url: string,
    data?: {},
    opts?: {
      headers: { [name: string]: string };
    },
    hideDataOnError?: boolean,
    noErrorTransform?: boolean
  ) {
    return this.apiTester.req(
      method,
      url,
      data,
      opts,
      hideDataOnError,
      noErrorTransform
    );
  }

  async dispose() {
    await this.apiTester.dispose();
  }
}

const c = initContract();
const publicContract = c.router({
  publicCmsReadsContract,
});

/** For testing our public API, e.g. data.plasmic.app. */
export class PublicApiTester extends ApiTester {
  readonly tsRestClient: InitClientReturn<typeof publicContract, any>;

  constructor(baseURL: string, baseHeaders: { [name: string]: string } = {}) {
    super(baseURL, baseHeaders);
    this.tsRestClient = initClient(publicContract, {
      baseUrl: baseURL,
      baseHeaders,
    });
  }

  async getPublishedLoaderAssets(
    projects: Project[],
    queryParams: {
      platform?: string;
      nextjsAppDir?: string;
      browserOnly?: string;
      loaderVersion?: string;
      i18nKeyScheme?: string;
      i18nTagPrefix?: string;
      skipHead?: string;
    }
  ): Promise<APIResponse> {
    const queryString = new URLSearchParams(queryParams);
    projects.forEach((p) => queryString.append("projectId", p.id));
    const projectTokens = projects
      .map((p) => `${p.id}:${p.projectApiToken}`)
      .join(",");
    return this.rawReq(
      "get",
      `/api/v1/loader/code/published?${queryString.toString()}`,
      undefined,
      {
        headers: {
          "x-plasmic-api-project-tokens": projectTokens,
        },
        maxRedirects: 0, // do not follow
      }
    );
  }
}

/** Expects the ts-rest response to have a status and narrows the type. */
export function expectStatus<
  Response extends { status: number; headers: unknown; body: unknown },
  ExpectedStatus extends number
>(
  res: Response,
  status: ExpectedStatus
): Response extends { status: ExpectedStatus } ? Response : never {
  expect(res.status).toEqual(status);
  return res as Response extends { status: ExpectedStatus } ? Response : never;
}
