import { setupPassport } from "@/wab/server/auth/passport-cfg";
import { ssoCallback, ssoLogin } from "@/wab/server/auth/routes";
import { Config } from "@/wab/server/config";
import { DbMgr } from "@/wab/server/db/DbMgr";
import * as routeUtil from "@/wab/server/routes/util";
import { ForbiddenError } from "@/wab/shared/ApiErrors/errors";
import { DEVFLAGS } from "@/wab/shared/devflags";
import * as Sentry from "@sentry/node";
import { Request, Response } from "express-serve-static-core";
import { VerifyCallback } from "passport-oauth2";

vi.mock("@sentry/node", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/node")>()),
  captureException: vi.fn(() => "event-id"),
}));

// Simulate a provider returning no profile without contacting an IdP.
vi.mock("passport-okta-oauth20/dist/src/Strategy", () => ({
  default: class {
    error!: (error: unknown) => void;
    constructor(
      _options: unknown,
      private verify: (
        req: Request,
        accessToken: string,
        refreshToken: string,
        profile: unknown,
        done: VerifyCallback,
      ) => void,
    ) {}
    authenticate(req: Request) {
      this.verify(req, "access-token", "refresh-token", undefined, (err) =>
        this.error(err),
      );
    }
  },
}));

describe("SSO errors", () => {
  const findConfig = vi.fn();
  const req = {
    params: { tenantId: "tenant" },
    query: {},
    body: {},
    headers: {},
  } as unknown as Request;

  beforeEach(async () => {
    findConfig.mockReset();
    vi.spyOn(routeUtil, "userDbMgr").mockReturnValue({
      getSsoConfigByTenantId: findConfig,
    } as unknown as DbMgr);
    vi.mocked(Sentry.captureException).mockClear();
    await setupPassport(
      {} as DbMgr,
      { host: "http://localhost" } as Config,
      DEVFLAGS,
    );
  });

  it("forwards unavailable SSO configuration to Express as forbidden", async () => {
    findConfig.mockResolvedValue(undefined);
    const next = vi.fn();
    await ssoLogin(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("rejects an unavailable callback configuration as forbidden", async () => {
    findConfig.mockResolvedValue(undefined);
    await expect(
      ssoCallback(req, {} as Response, vi.fn()),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("forwards database failures without reclassifying them as authentication failures", async () => {
    const error = new Error("Database unavailable");
    findConfig.mockRejectedValue(error);
    const next = vi.fn();
    await ssoLogin(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("reports a missing profile as an invariant failure through the existing popup callback", async () => {
    findConfig.mockResolvedValue({
      id: "config",
      tenantId: "tenant",
      provider: "okta",
      config: {},
    });
    const send = vi.fn();
    await ssoCallback(req, { send } as unknown as Response, vi.fn());
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "SSO strategy must provide a user profile",
        ),
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining(
        'window.localStorage.setItem("authStatus", authStatus)',
      ),
    );
  });
});
