import { DbMgr } from "@/wab/server/db/DbMgr";
import { getPkgVersionPublishStatus } from "@/wab/server/routes/projects";
import * as Sentry from "@sentry/node";
import { Request, Response } from "express-serve-static-core";

// projects.ts calls codegen through the global fetch.
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
vi.mock("@sentry/node", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/node")>()),
  captureException: vi.fn(),
}));
vi.mock("@/wab/server/routes/util", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/wab/server/routes/util")>()),
  userDbMgr: () => mockDbMgr,
}));

let mockDbMgr: DbMgr;

describe("getPkgVersionPublishStatus", () => {
  async function getStatus(
    codegenResponse: Response | globalThis.Response,
    opts: { version?: string; isPrefilled?: boolean } = {},
  ) {
    mockDbMgr = {
      validateOrGetProjectApiToken: vi.fn(async () => "token"),
      getRecentLoaderPublishments: vi.fn(async () => [{}]),
      getPkgVersionById: vi.fn(async () => ({
        version: opts.version ?? "1.2.3",
        isPrefilled: opts.isPrefilled ?? true,
      })),
    } as unknown as DbMgr;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(codegenResponse);
    const res = { json: vi.fn() } as unknown as Response;
    await getPkgVersionPublishStatus(
      {
        params: { projectId: "abc", pkgVersionId: "pkgVersion" },
        promLabels: {},
      } as unknown as Request,
      res,
    );
    return vi.mocked(res.json).mock.calls[0][0].status;
  }

  function redirectTo(location: string) {
    return new globalThis.Response(null, {
      status: 302,
      headers: { location },
    });
  }

  function jsonRedirectTo(redirectUrl: string) {
    return globalThis.Response.json({ redirectUrl });
  }

  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
  });

  // Codegen sends relative redirects, which fetch doesn't make absolute.
  it.each([
    ["relative redirect", redirectTo],
    ["polyfill JSON redirect", jsonRedirectTo],
  ])("parses the version from a %s", async (_name, respond) => {
    const location =
      "/api/v1/loader/code/versioned?platform=react&projectId=abc%401.2.2";
    expect(await getStatus(respond(location))).toBe("pre-filling");
    expect(await getStatus(respond(location.replace("1.2.2", "1.2.3")))).toBe(
      "ready",
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("parses the version from an absolute redirect", async () => {
    const location =
      "https://codegen.plasmic.app/api/v1/loader/code/versioned?projectId=abc%401.2.2";
    expect(await getStatus(redirectTo(location))).toBe("pre-filling");
    expect(await getStatus(redirectTo(location), { version: "1.2.2" })).toBe(
      "ready",
    );
  });

  it("is not ready until the version is prefilled", async () => {
    const location = "/api/v1/loader/code/versioned?projectId=abc%401.2.3";
    expect(await getStatus(redirectTo(location), { isPrefilled: false })).toBe(
      "pre-filling",
    );
  });
});
