import { createInlineRateLimiter } from "@/wab/server/rate-limit";
import { RateLimitedExceeded } from "@/wab/shared/ApiErrors/errors";
import { Request, Response } from "express-serve-static-core";

function mkReq(key: string) {
  return { params: { key }, headers: {} } as unknown as Request;
}

function mkRes() {
  return {
    headersSent: false,
    setHeader: () => {},
    getHeader: () => undefined,
    append: () => {},
  } as unknown as Response;
}

describe("createInlineRateLimiter", () => {
  function mkLimiter(limit: number) {
    return createInlineRateLimiter({
      windowMs: 60 * 1000,
      limit,
      keyGenerator: (req) => req.params.key,
      makeError: () => new RateLimitedExceeded("slow down"),
    });
  }

  it("counts only the requests that reach it, per key", async () => {
    const check = mkLimiter(2);
    await check(mkReq("a"), mkRes());
    await check(mkReq("a"), mkRes());
    await expect(check(mkReq("a"), mkRes())).rejects.toThrow(
      RateLimitedExceeded,
    );
    // Another key has its own quota.
    await expect(check(mkReq("b"), mkRes())).resolves.toBeUndefined();
  });

  it("blocks everything with a limit of 0", async () => {
    const check = mkLimiter(0);
    await expect(check(mkReq("a"), mkRes())).rejects.toThrow("slow down");
  });
});
