import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { genSiteErrors } from "@/wab/shared/site-invariants";
import { context, propagation, trace } from "@opentelemetry/api";
import * as Sentry from "@sentry/node";
import { once } from "node:events";
import { createServer, get } from "node:http";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return {
    ...actual,
    init: (options: Sentry.NodeOptions) =>
      actual.init({
        ...options,
        registerEsmLoaderHooks: false,
        sendClientReports: false,
        transport: () => ({ send: async () => ({}), flush: async () => true }),
      }),
  };
});

afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  Sentry.getCurrentScope().clear();
  Sentry.getIsolationScope().clear();
  context.disable();
  trace.disable();
  propagation.disable();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("keeps WAB Sentry tags and users isolated across concurrent HTTP requests", async () => {
  vi.stubEnv("SENTRY_DSN", "http://public@127.0.0.1/1");
  await import("@/wab/server/sentry");
  const events: Sentry.Event[] = [];
  Sentry.getClient()?.addEventProcessor((event) => {
    events.push(event);
    return event;
  });
  expect(Sentry.getClient()?.getOptions()).toMatchObject({
    skipOpenTelemetrySetup: true,
  });

  const scopes = new Map<string, ReturnType<typeof Sentry.getIsolationScope>>();
  let arrivals = 0;
  let release = () => {};
  const bothStarted = new Promise<void>((resolve) => {
    release = resolve;
  });
  const server = createServer((req, res) => {
    const id = req.url?.slice(1) ?? "unknown";
    const scope = Sentry.getIsolationScope();
    scopes.set(id, scope);
    const respond = async () => {
      if (id !== "untagged") {
        scope.setTag("requestId", id);
        scope.setUser({ id });
        if (++arrivals === 2) {
          release();
        }
        await bothStarted;
      }
      Sentry.captureException(new Error(id));
      res.end(id);
    };
    void respond().catch((error) => {
      res.statusCode = 500;
      res.end(String(error));
    });
  });
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP address");
    }
    const origin = `http://127.0.0.1:${address.port}`;
    const request = (id: string) =>
      new Promise<string>((resolve, reject) => {
        get(`${origin}/${id}`, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => resolve(body));
          res.on("error", reject);
        }).on("error", reject);
      });
    expect(await Promise.all([request("a"), request("b")])).toEqual(["a", "b"]);
    expect(await request("untagged")).toBe("untagged");
    expect(await Sentry.flush(1000)).toBe(true);
    expect(events).toHaveLength(3);
    expect(scopes.get("a")).not.toBe(scopes.get("b"));
    for (const id of ["a", "b", "untagged"]) {
      const event = events.find((e) => e.exception?.values?.[0]?.value === id);
      expect(event).toBeDefined();
      expect(event?.request?.url).toBe(`${origin}/${id}`);
      expect(event?.tags?.requestId).toBe(id === "untagged" ? undefined : id);
      expect(event?.user?.id).toBe(id === "untagged" ? undefined : id);
    }
    expect(
      Sentry.getIsolationScope().getScopeData().tags.requestId,
    ).toBeUndefined();

    const site = createSite();
    site.components.push(
      ...[1, 2].map(() =>
        mkComponent({
          name: "Duplicate",
          tplTree: mkTplTagX("div"),
          type: ComponentType.Plain,
        }),
      ),
    );
    Array.from(genSiteErrors(site));
    expect(await Sentry.flush(1000)).toBe(true);
    expect(
      events.some(
        (event) =>
          event.exception?.values?.[0]?.value ===
          "Cannot save project - Duplicated component name: Duplicate",
      ),
    ).toBe(true);
  } finally {
    release();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
