/** @jest-environment node */
import { makeHttpFetcher } from "@/wab/server/data-sources/http-fetcher";
import {
  setupSsrfTestServers,
  SsrfTestServers,
} from "@/wab/server/testonly/test-server";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { HttpDataSource } from "@/wab/shared/data-sources-meta/http-meta";

describe("makeHttpFetcher", () => {
  let ssrf: SsrfTestServers | undefined;

  beforeEach(async () => {
    ssrf = await setupSsrfTestServers();
  });

  afterEach(async () => {
    await ssrf?.dispose();
  });

  it("fetches an external IP", async () => {
    await expect(
      makeHttpFetcher({
        source: "http",
        credentials: {},
        settings: { baseUrl: ssrf!.externalGoodServer.url, commonHeaders: {} },
      } as HttpDataSource).get({})
    ).resolves.toMatchObject({
      data: {
        response: { result: "Hello, world!" },
        statusCode: 200,
      },
    });
    expect(ssrf!.externalGoodServer.requestCount()).toBe(1);
  });

  it("does not fetch an internal IP", async () => {
    await expect(
      makeHttpFetcher({
        source: "http",
        credentials: {},
        settings: { baseUrl: ssrf!.internalServer.url, commonHeaders: {} },
      } as HttpDataSource).get({})
    ).rejects.toThrow(DataSourceError);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });

  it("does not fetch an internal IP via external redirect", async () => {
    await expect(
      makeHttpFetcher({
        source: "http",
        credentials: {},
        settings: { baseUrl: ssrf!.externalBadServer.url, commonHeaders: {} },
      } as HttpDataSource).get({})
    ).rejects.toThrow(DataSourceError);
    expect(ssrf!.externalBadServer.requestCount()).toBe(1);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });
});
