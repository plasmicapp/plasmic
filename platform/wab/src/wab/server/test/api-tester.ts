import { ApiUser } from "@/wab/shared/ApiSchema";
import { SharedApi } from "@/wab/shared/SharedApi";
import { APIRequestContext } from "playwright";

export class ApiTester extends SharedApi {
  constructor(
    private readonly api: APIRequestContext,
    private readonly baseURL
  ) {
    super();
  }

  protected setUser(_user: ApiUser): void {}
  protected clearUser(): void {}
  protected async req(
    method: "get" | "post" | "put" | "delete" | "patch",
    url: string,
    data?: {} | undefined,
    opts?: { headers: { [name: string]: string } },
    _hideDataOnError?: boolean | undefined,
    _noErrorTransform?: boolean | undefined
  ): Promise<any> {
    console.info("HTTP request", method, url, data);
    const res = await this.api.fetch(`${this.baseURL}${url}`, {
      method,
      headers: opts?.headers,
      data,
    });
    const json = await res.json();
    console.info("HTTP response", method, url, json);
    return json;
  }
}
