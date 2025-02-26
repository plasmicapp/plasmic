import { ApiUser } from "@/wab/shared/ApiSchema";
import { SharedApi } from "@/wab/shared/SharedApi";
import { APIRequestContext } from "playwright";

interface ApiTesterRequestOptions {
  headers?: { [name: string]: string };
  maxRedirects?: number;
}

export class ApiTester extends SharedApi {
  constructor(
    private readonly api: APIRequestContext,
    private readonly baseURL: string,
    private readonly baseHeaders: { [name: string]: string } = {}
  ) {
    super();
  }

  protected setUser(_user: ApiUser): void {}
  protected clearUser(): void {}

  protected async req(
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

  protected async rawReq(
    method: "get" | "post" | "put" | "delete" | "patch",
    url: string,
    data?: {} | undefined,
    { headers, ...opts }: ApiTesterRequestOptions = {}
  ) {
    const mergedHeaders = { ...this.baseHeaders, ...headers };
    console.info("HTTP request", method, url, mergedHeaders, data);
    return this.api.fetch(`${this.baseURL}${url}`, {
      method,
      headers: mergedHeaders,
      data,
      ...opts,
    });
  }
}
