import { _testonly } from "@/wab/server/util/url";
import http, { RequestListener } from "http";
import { isIPv6 } from "net";

const ssrfAllowedIpAddresses = _testonly.ssrfAllowedIpAddresses;

export interface TestServer {
  url: string;
  port: number;
  requestCount: () => number;
  dispose: () => Promise<void>;
}

export async function startTestServer(
  ipAddr: string,
  requestListener: RequestListener
): Promise<TestServer> {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    requestCount++;
    requestListener(req, res);
  });
  const port = await listen(server, ipAddr);
  const host = isIPv6(ipAddr) ? `[${ipAddr}]` : ipAddr;
  return {
    url: `http://${host}:${port}`,
    port,
    requestCount: () => requestCount,
    dispose: () => close(server),
  };
}

/**
 * Loopback addresses for the "internal" server, tried in order. It must be
 * distinct from the allowlisted external IP (127.0.0.1) and blocked by the SSRF
 * guard by default. `::1` works on macOS (local dev); Linux CI runners often
 * lack IPv6 loopback, where 127.0.0.2 (also loopback, also blocked, and not
 * allowlisted) binds instead.
 */
const INTERNAL_IP_CANDIDATES = ["::1", "127.0.0.2"];

/** Starts the "internal" SSRF test server on the first bindable loopback addr. */
export async function startInternalTestServer(
  requestListener: RequestListener
): Promise<TestServer> {
  let lastErr: unknown;
  for (const ipAddr of INTERNAL_IP_CANDIDATES) {
    try {
      return await startTestServer(ipAddr, requestListener);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Could not bind internal test server to any of [${INTERNAL_IP_CANDIDATES.join(
      ", "
    )}]: ${String(lastErr)}`
  );
}

/** Start the server and return the port it's listening to. */
function listen(server: http.Server, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (typeof address === "object" && address !== null) {
        resolve(address.port);
      } else {
        reject(`unexpected address: ${address}`);
      }
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

export interface SsrfTestServers {
  internalServer: TestServer;
  externalGoodServer: TestServer;
  externalBadServer: TestServer;
  expectedGoodContent: string;
  dispose: () => Promise<void>;
}

/**
 * Starts up 3 servers for SSRF testing.
 *
 * One internal server at a non-allowlisted loopback (::1, or 127.0.0.2 in CI).
 * One good external server at 127.0.0.1.
 * One bad external server at 127.0.0.1 that redirects to the internal server.
 *
 * 127.0.0.1 is added to ssrfAllowedIpAddresses for you.
 */
export async function setupSsrfTestServers(): Promise<SsrfTestServers> {
  const externalIpAddr = "127.0.0.1";
  const expectedGoodContent = '{"result":"Hello, world!"}';

  const internalServer = await startInternalTestServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("INTERNAL ONLY");
  });
  const externalGoodServer = await startTestServer(
    externalIpAddr,
    (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(expectedGoodContent);
    }
  );
  const externalBadServer = await startTestServer(
    externalIpAddr,
    (_req, res) => {
      res.writeHead(302, { Location: `${internalServer!.url}` });
      res.end();
    }
  );
  ssrfAllowedIpAddresses.push(externalIpAddr);
  return {
    internalServer,
    externalGoodServer,
    externalBadServer,
    expectedGoodContent,
    dispose: async () => {
      await internalServer.dispose();
      await externalGoodServer.dispose();
      await externalBadServer.dispose();
      ssrfAllowedIpAddresses.length = 0;
    },
  };
}
