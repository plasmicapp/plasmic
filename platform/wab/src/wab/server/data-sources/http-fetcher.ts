import { base64StringToBuffer } from "@/wab/server/data-sources/data-utils";
import { fetchUntrusted, UnsafeUrlError } from "@/wab/server/util/url";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { HttpDataSource } from "@/wab/shared/data-sources-meta/http-meta";
import { AxiosResponse } from "axios";
import { isEmpty, isNil, isString } from "lodash";

const DEFAULT_TIMEOUT = 175000;

export function makeHttpFetcher(source: HttpDataSource) {
  return new HttpFetcher(source);
}

export class HttpFetcher {
  private readonly baseUrl: string;
  constructor(private source: HttpDataSource) {
    this.baseUrl = source.settings.baseUrl.endsWith("/")
      ? source.settings.baseUrl
      : `${source.settings.baseUrl}/`;
  }
  async get(opts: {
    path?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return this.request("GET", opts);
  }

  async post(opts: {
    path?: string;
    body?: string | object;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return this.request("POST", opts);
  }

  async put(opts: {
    path?: string;
    body?: string | object;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return this.request("PUT", opts);
  }

  async delete(opts: {
    path?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return this.request("DELETE", opts);
  }

  async patch(opts: {
    path?: string;
    body?: string | object;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return this.request("PATCH", opts);
  }

  private async request(
    method: string,
    opts: {
      path?: string;
      body?: string | object;
      params?: Record<string, string>;
      headers?: Record<string, string>;
    }
  ) {
    const url = this.makeUrl(opts.path, opts.params).toString();
    const headers = this.makeHeaders(opts.headers);
    const data = bodyToFetchBody(opts.body);
    let res: AxiosResponse<string>;
    try {
      res = await fetchUntrusted({
        method,
        url,
        headers,
        data,
        timeout: DEFAULT_TIMEOUT,
      });
    } catch (e) {
      if (e instanceof UnsafeUrlError) {
        throw new DataSourceError("Invalid URL", 400);
      } else {
        throw e;
      }
    }
    return processResult(res);
  }

  private makeUrl(path?: string, params?: Record<string, string>) {
    const fixedPath = isNil(path)
      ? ""
      : path.startsWith("/")
      ? path.slice(1)
      : path;
    const url = new URL(this.baseUrl + fixedPath);

    const searchParams = new URLSearchParams(params);
    Array.from(searchParams.entries()).forEach(([k, v]) => {
      url.searchParams.append(k, v);
    });
    return url;
  }

  private makeHeaders(headers?: Record<string, string>) {
    return {
      ...(this.source.settings.commonHeaders
        ? this.source.settings.commonHeaders
        : this.source.credentials.commonHeaders),
      ...headers,
    };
  }
}

async function processResult(res: AxiosResponse<string>) {
  let processedResponse: string | any = res.data;
  const statusCode = res.status;
  try {
    processedResponse = JSON.parse(processedResponse);
  } catch {}
  if (statusCode >= 400) {
    throw new DataSourceError(
      isString(processedResponse) || !isEmpty(processedResponse)
        ? processedResponse
        : undefined,
      statusCode
    );
  }
  return {
    data: {
      response: processedResponse,
      statusCode,
      headers: { ...res.headers },
    },
  };
}

function bodyToFetchBody(body?: string | object) {
  if (body == null) {
    return undefined;
  } else if (typeof body === "object") {
    return JSON.stringify(body);
  } else if (body.startsWith("@binary")) {
    return base64StringToBuffer(body.slice("@binary".length));
  } else {
    return body;
  }
}
