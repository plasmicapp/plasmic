import { base64StringToBuffer } from "@/wab/server/data-sources/data-utils";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { HttpDataSource } from "@/wab/shared/data-sources-meta/http-meta";
import { isEmpty, isNil, isString } from "lodash";
import fetch, { Response } from "node-fetch";

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
    const res = await fetch(this.makePath(opts.path, opts.params), {
      method: "GET",
      headers: this.makeHeaders(opts.headers),
      timeout: DEFAULT_TIMEOUT,
    });
    return processResult(res);
  }

  async post(opts: {
    path?: string;
    body?: string | object;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    const res = await fetch(this.makePath(opts.path, opts.params), {
      method: "POST",
      headers: this.makeHeaders(opts.headers),
      body: bodyToFetchBody(opts.body),
      timeout: DEFAULT_TIMEOUT,
    });
    return processResult(res);
  }

  async put(opts: {
    path?: string;
    body?: string | object;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    const res = await fetch(this.makePath(opts.path, opts.params), {
      method: "PUT",
      headers: this.makeHeaders(opts.headers),
      body: bodyToFetchBody(opts.body),
      timeout: DEFAULT_TIMEOUT,
    });
    return processResult(res);
  }

  async delete(opts: {
    path?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    const res = await fetch(this.makePath(opts.path, opts.params), {
      method: "DELETE",
      headers: this.makeHeaders(opts.headers),
      timeout: DEFAULT_TIMEOUT,
    });
    return processResult(res);
  }

  async patch(opts: {
    path?: string;
    body?: string | object;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    const res = await fetch(this.makePath(opts.path, opts.params), {
      method: "PATCH",
      headers: this.makeHeaders(opts.headers),
      body: bodyToFetchBody(opts.body),
      timeout: DEFAULT_TIMEOUT,
    });
    return processResult(res);
  }

  private makePath(path?: string, params?: Record<string, string>) {
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
    return url.toString();
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

async function processResult(res: Response) {
  let processedResponse: string | any = await res.text();
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
      headers: Object.fromEntries(res.headers.entries()),
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
