import type { IncomingHttpHeaders } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expressRequestContextMiddleware,
  honoRequestContextMiddleware,
  initObservability,
} from "./node";

afterEach(() => vi.restoreAllMocks());

describe("request context middleware", () => {
  it.each([undefined, "", " ", "a,b", "a".repeat(129), ["a", "b"]])(
    "replaces an absent or invalid upstream request ID (%s)",
    (requestId) => {
      const { logger, withLogContext } = initObservability("test", "test", {});
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const headers: IncomingHttpHeaders = { "x-request-id": requestId };
      const req = { id: "previous", headers, method: "GET", path: "/example" };
      const next = vi.fn(() => logger.info("inside"));
      expressRequestContextMiddleware(withLogContext)(req, undefined, next);
      expect(next).toHaveBeenCalledOnce();
      expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(headers["x-request-id"]).toBe(req.id);
      expect(info).toHaveBeenCalledWith(
        "[logger.info] inside",
        expect.objectContaining({
          requestId: req.id,
          requestMethod: "GET",
          requestPath: "/example",
        }),
      );
      logger.info("outside");
      expect(info.mock.calls.at(-1)?.[1].requestId).toBeUndefined();
    },
  );

  it("preserves a normalized upstream ID across Hono and Express adapters", async () => {
    const upstream = initObservability("proxy", "test", {});
    const downstream = initObservability("backend", "test", {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const raw = new Request("http://example.test/path?ignored=query", {
      headers: { "x-request-id": " upstream-a " },
    });
    await honoRequestContextMiddleware(upstream.withLogContext)(
      { req: { raw, method: "GET", path: "/path" } },
      async () => {
        await Promise.resolve();
        upstream.logger.info("proxy");
        const req = {
          id: "",
          headers: Object.fromEntries(raw.headers),
          method: "GET",
          path: "/forwarded",
        };
        expressRequestContextMiddleware(downstream.withLogContext)(
          req,
          undefined,
          () => downstream.logger.info("backend"),
        );
        expect(req.id).toBe("upstream-a");
      },
    );
    expect(info.mock.calls.map(([, properties]) => properties)).toEqual([
      expect.objectContaining({
        serviceName: "proxy",
        requestId: "upstream-a",
        requestPath: "/path",
      }),
      expect.objectContaining({
        serviceName: "backend",
        requestId: "upstream-a",
        requestPath: "/forwarded",
      }),
    ]);
  });

  it("restores context when a Hono handler rejects", async () => {
    const { logger, withLogContext } = initObservability("test", "test", {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const raw = new Request("http://example.test/failure");
    const error = new Error("failed");
    await expect(
      honoRequestContextMiddleware(withLogContext)(
        { req: { raw, method: "GET", path: "/failure" } },
        async () => {
          await Promise.resolve();
          logger.info("inside");
          throw error;
        },
      ),
    ).rejects.toBe(error);
    expect(info.mock.calls[0][1].requestId).toBe(
      raw.headers.get("x-request-id"),
    );
    logger.info("outside");
    expect(info.mock.calls.at(-1)?.[1].requestId).toBeUndefined();
  });
});
