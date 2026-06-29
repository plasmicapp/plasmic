/** @jest-environment node */
import { makeGraphqlFetcher } from "@/wab/server/data-sources/graphql-fetcher";
import {
  setupSsrfTestServers,
  SsrfTestServers,
} from "@/wab/server/testonly/test-server";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { GraphqlDataSource } from "@/wab/shared/data-sources-meta/graphql-meta";

describe("makeGraphqlFetcher", () => {
  let ssrf: SsrfTestServers | undefined;

  beforeEach(async () => {
    ssrf = await setupSsrfTestServers();
  });

  afterEach(async () => {
    await ssrf?.dispose();
  });

  it("fetches an external IP", async () => {
    await expect(
      makeGraphqlFetcher({
        source: "graphql",
        settings: { baseUrl: ssrf!.externalGoodServer.url },
      } as GraphqlDataSource).query({ query: "{ __typename }" })
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
      makeGraphqlFetcher({
        source: "graphql",
        settings: { baseUrl: ssrf!.internalServer.url },
      } as GraphqlDataSource).query({ query: "{ __typename }" })
    ).rejects.toThrow(DataSourceError);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });

  it("does not fetch an internal IP via external redirect", async () => {
    await expect(
      makeGraphqlFetcher({
        source: "graphql",
        settings: { baseUrl: ssrf!.externalBadServer.url },
      } as GraphqlDataSource).query({ query: "{ __typename }" })
    ).rejects.toThrow(DataSourceError);
    expect(ssrf!.externalBadServer.requestCount()).toBe(1);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });
});
