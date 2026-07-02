/** @jest-environment node */
import {
  setupSsrfTestServers,
  SsrfTestServers,
  startInternalTestServer,
  TestServer,
} from "@/wab/server/testonly/test-server";
import { fetchUntrusted, UnsafeUrlError } from "@/wab/server/util/url";

describe("fetchUntrusted", () => {
  let ssrf: SsrfTestServers | undefined;

  beforeEach(async () => {
    ssrf = await setupSsrfTestServers();
  });

  afterEach(async () => {
    await ssrf?.dispose();
  });

  it("fetches an external IP", async () => {
    await expect(
      fetchUntrusted({
        method: "GET",
        url: ssrf!.externalGoodServer.url,
      })
    ).resolves.toMatchObject({
      status: 200,
      data: ssrf!.expectedGoodContent,
    });
    expect(ssrf!.externalGoodServer.requestCount()).toBe(1);
  });

  it("does not fetch an internal IP", async () => {
    await expect(
      fetchUntrusted({ method: "GET", url: ssrf!.internalServer.url })
    ).rejects.toThrow(UnsafeUrlError);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });

  it("does not fetch an internal IP via external redirect", async () => {
    await expect(
      fetchUntrusted({ method: "GET", url: ssrf!.externalBadServer.url })
    ).rejects.toThrow(UnsafeUrlError);
    expect(ssrf!.externalBadServer.requestCount()).toBe(1);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });
});

// These tests are skipped if these services go down or respond too slowly.
describe("fetchUntrusted - e2e test with external redirect service", () => {
  const REDIRECT_SERVICES = [
    "https://httpbin.org",
    "https://nghttp2.org/httpbin",
  ];

  function redirectTo(redirectService: string, targetUrl: string) {
    return `${redirectService}/redirect-to?url=${encodeURIComponent(
      targetUrl
    )}&status_code=302`;
  }

  // Do our best to ignore transient failures and fail on real ones.
  const TRANSIENT_NETWORK_CODES = new Set([
    "ECONNABORTED", // axios timeout
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
    "ERR_NETWORK",
    "ERR_CANCELED",
  ]);

  function isTransientNetworkError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      TRANSIENT_NETWORK_CODES.has((error as { code: string }).code)
    );
  }

  let internalServer: TestServer | undefined;

  beforeEach(async () => {
    internalServer = await startInternalTestServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("INTERNAL ONLY");
    });
  });

  afterEach(async () => {
    await internalServer?.dispose();
  });

  it("follows redirect with fetch but fails with fetchUntrusted", async () => {
    for (const redirectService of REDIRECT_SERVICES) {
      // Craft URL with 2 redirect hops (external -> external -> internal)
      const url = redirectTo(
        redirectService,
        redirectTo(redirectService, internalServer!.url)
      );

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000),
        });
        // If the initial fetch succeeds, verify we hit our internal server.
        expect(await response.text()).toBe("INTERNAL ONLY");
      } catch (e) {
        // If the initial fetch fails, we try the next redirect service.
        console.warn(`Skipping ${redirectService}`, e);
        continue;
      }
      const requestsAfterFetch = internalServer!.requestCount();
      expect(requestsAfterFetch).toBeGreaterThan(0);

      // fetchUntrusted should reject the second redirect. The timeout bounds each redirect
      // hop to avoid hanging if the service degrades between the above fetch and this.
      let redirectCount = 0;
      let unsafeError: UnsafeUrlError | undefined;
      let skipReason: unknown;
      try {
        const res = await fetchUntrusted({
          method: "GET",
          url,
          timeout: 5000,
          beforeRedirect: () => {
            ++redirectCount;
          },
        });
        skipReason = `resolved with status ${res.status} instead of redirecting`;
      } catch (e) {
        if (e instanceof UnsafeUrlError) {
          unsafeError = e;
        } else if (isTransientNetworkError(e)) {
          skipReason = e;
        } else {
          throw e;
        }
      }

      // No matter how the redirect service behaves, fetchUntrusted shouldn't
      // reach the internal server.
      expect(internalServer!.requestCount()).toBe(requestsAfterFetch);

      if (unsafeError) {
        expect(redirectCount).toBe(2);
        return;
      }

      // The service answered the fetch but degraded before fetchUntrusted.
      console.warn(`Skipping ${redirectService}`, skipReason);
    }

    console.warn("url.spec.ts - ALL REDIRECT SERVICES SKIPPED");
  }, 30000);
});
