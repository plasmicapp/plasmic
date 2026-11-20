/** @vitest-environment node */
import type { DbMgr } from "@/wab/server/db/DbMgr";
import { NotFoundError as DbNotFoundError } from "@/wab/server/db/DbMgr";
import {
  genRevisionLoaderCodeBundle,
  LOADER_CACHE_BUST,
} from "@/wab/server/loader/gen-code-bundle";
import {
  _testonly,
  buildLatestRevisionLoaderRedirect,
  buildRevisionLoaderAssets,
  makeCacheableRevisionLoaderQuery,
  makeRevisionRedirectLocation,
} from "@/wab/server/routes/loader";
import { userDbMgr } from "@/wab/server/routes/util";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import type { Request, Response } from "express-serve-static-core";
import { gunzipSync } from "zlib";

vi.mock("@/wab/server/routes/util", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  userDbMgr: vi.fn(),
}));
vi.mock("@/wab/server/loader/gen-code-bundle", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  genRevisionLoaderCodeBundle: vi.fn(),
}));

const CDN_URL = "https://codegen.plasmic.app";
const ORIGIN_URL = "https://codegen-origin.plasmic.app";

function mkMgr() {
  return {
    listBranchesForProject: vi.fn(async () => [
      { id: "branchId1", name: "feature" },
    ]),
    checkProjectPerms: vi.fn(async () => {}),
    getLatestProjectRevRef: vi.fn(
      async (projectId: string, { branchId }: { branchId?: string }) => ({
        id: `${projectId}-${branchId ?? "main"}-rev`,
        revision: 3,
        branchId: branchId ?? null,
      }),
    ),
    getProjectRevRefByIdForProject: vi.fn(
      async (_projectId: string, revisionId: string) => ({
        id: revisionId,
        revision: 3,
        branchId: null,
      }),
    ),
    getProjectById: vi.fn(async (id: string) => ({ id, name: `name-${id}` })),
  };
}

function mkReq(opts: {
  query: Record<string, string | string[]>;
  headers?: Record<string, string>;
  user?: { id: string };
  body?: Record<string, unknown>;
  acceptsGzip?: boolean;
}) {
  return {
    query: opts.query,
    headers: opts.headers ?? {},
    user: opts.user,
    body: opts.body ?? {},
    acceptsEncodings: vi.fn((encoding: string) =>
      encoding === "gzip" && opts.acceptsGzip ? "gzip" : false,
    ),
    promLabels: {},
    analytics: { track: vi.fn() },
    workerpool: {},
  } as unknown as Request;
}

function mkRes() {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    }),
    vary: vi.fn((name: string) => {
      headers.vary = headers.vary ? `${headers.vary}, ${name}` : name;
    }),
    set: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    }),
    type: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
    location: vi.fn().mockReturnThis(),
    end: vi.fn(),
  };
  return res as typeof res & Response;
}

function expectRedirect(res: ReturnType<typeof mkRes>, location: unknown) {
  expect(res.status).toHaveBeenCalledExactlyOnceWith(302);
  expect(res.location).toHaveBeenCalledExactlyOnceWith(location);
  expect(res.end).toHaveBeenCalledExactlyOnceWith();
}

let mgr: ReturnType<typeof mkMgr>;

beforeEach(() => {
  vi.stubEnv("CODEGEN_HOST", CDN_URL);
  vi.stubEnv("CODEGEN_ORIGIN_HOST", ORIGIN_URL);
  mgr = mkMgr();
  vi.mocked(userDbMgr).mockReturnValue(mgr as unknown as DbMgr);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("makeCacheableRevisionLoaderQuery", () => {
  it("sorts revision specs and always sets loaderVersion", () => {
    const query = makeCacheableRevisionLoaderQuery({
      platform: "nextjs",
      nextjsAppDir: true,
      loaderVersion: 10,
      projectRevisions: [
        { projectId: "projB", revisionId: "rev2" },
        { projectId: "projA", revisionId: "rev1" },
      ],
      browserOnly: true,
      i18nKeyScheme: "hash",
      i18nTagPrefix: "x-",
      skipHead: true,
    });
    expect(query).toEqual(
      `cb=${LOADER_CACHE_BUST}&platform=nextjs&nextjsAppDir=true&loaderVersion=10` +
        `&projectId=projA%40rev%3Arev1&projectId=projB%40rev%3Arev2` +
        `&browserOnly=true&i18nKeyScheme=hash&i18nTagPrefix=x-&skipHead=true`,
    );
  });

  it("keeps loaderVersion=0", () => {
    const query = makeCacheableRevisionLoaderQuery({
      platform: "react",
      nextjsAppDir: false,
      loaderVersion: 0,
      projectRevisions: [{ projectId: "projA", revisionId: "rev1" }],
      browserOnly: false,
    });
    expect(query).toEqual(
      `cb=${LOADER_CACHE_BUST}&platform=react&loaderVersion=0&projectId=projA%40rev%3Arev1`,
    );
  });
});

describe("makeRevisionRedirectLocation", () => {
  const path = "/api/v1/loader/code/revision?projectId=p%40rev%3Ar";
  const location = (requestHost: string | undefined) =>
    makeRevisionRedirectLocation({
      requestHost,
      path,
      cdnUrl: CDN_URL,
      codegenOriginUrl: ORIGIN_URL,
    });

  it("is relative for the CDN host", () => {
    expect(location("codegen.plasmic.app")).toEqual(path);
    expect(location("Codegen.Plasmic.App")).toEqual(path);
  });

  it("is absolute to the CDN host for codegen-origin", () => {
    expect(location("codegen-origin.plasmic.app")).toEqual(
      `https://codegen.plasmic.app${path}`,
    );
  });

  it("stays relative on any other host", () => {
    expect(location("studio.plasmic.app")).toEqual(path);
    expect(location("loader-proxy.example.com")).toEqual(path);
    expect(location("localhost:3004")).toEqual(path);
  });

  it("is relative without a Host header", () => {
    expect(location(undefined)).toEqual(path);
  });

  it("uses the dev CDN host in dev", () => {
    const devLocation = (requestHost: string) =>
      makeRevisionRedirectLocation({
        requestHost,
        path,
        cdnUrl: "https://codegen.dev.plasmic.app",
        codegenOriginUrl: "https://codegen-origin.dev.plasmic.app",
      });
    expect(devLocation("codegen.dev.plasmic.app")).toEqual(path);
    expect(devLocation("codegen-origin.dev.plasmic.app")).toEqual(
      `https://codegen.dev.plasmic.app${path}`,
    );
    // Prod hosts are not codegen hosts in dev
    expect(devLocation("codegen-origin.plasmic.app")).toEqual(path);
  });

  it("keeps the CDN URL's scheme and port", () => {
    expect(
      makeRevisionRedirectLocation({
        requestHost: "localhost:3005",
        path,
        cdnUrl: "http://localhost:3004",
        codegenOriginUrl: "http://localhost:3005",
      }),
    ).toEqual(`http://localhost:3004${path}`);
  });
});

describe("buildLatestRevisionLoaderRedirect", () => {
  it("redirects to /code/revision for the latest revisions, relative on the CDN host", async () => {
    const req = mkReq({
      query: {
        platform: "nextjs",
        loaderVersion: "10",
        projectId: ["projB@feature", "projA"],
      },
      headers: { host: "codegen.plasmic.app" },
    });
    const res = mkRes();

    await buildLatestRevisionLoaderRedirect(req, res);

    expect(mgr.checkProjectPerms).toHaveBeenCalledWith(
      "projA",
      "viewer",
      "get",
    );
    expect(mgr.checkProjectPerms).toHaveBeenCalledWith(
      "projB",
      "viewer",
      "get",
    );
    expect(mgr.getLatestProjectRevRef).toHaveBeenCalledWith("projA", {
      branchId: undefined,
    });
    expect(mgr.getLatestProjectRevRef).toHaveBeenCalledWith("projB", {
      branchId: "branchId1",
    });
    expectRedirect(
      res,
      `/api/v1/loader/code/revision?cb=${LOADER_CACHE_BUST}&platform=nextjs&loaderVersion=10` +
        `&projectId=projA%40rev%3AprojA-main-rev&projectId=projB%40rev%3AprojB-branchId1-rev`,
    );
    expect(res.headers["cache-control"]).toEqual(
      "public, max-age=0, s-maxage=5",
    );
    expect(res.headers.vary).toEqual("x-plasmic-api-project-tokens");
    expect(req.promLabels.projectId).toEqual("projB,projA");
  });

  it("keeps a redirect authorized by a session private", async () => {
    const req = mkReq({
      query: { platform: "nextjs", loaderVersion: "10", projectId: "projA" },
      user: { id: "user1" },
    });
    const res = mkRes();

    await buildLatestRevisionLoaderRedirect(req, res);

    expectRedirect(res, expect.any(String));
    expect(res.headers["cache-control"]).toEqual("private, no-store");
  });

  it("keeps a redirect authorized by body tokens private", async () => {
    const req = mkReq({
      query: { platform: "nextjs", loaderVersion: "10", projectId: "projA" },
      body: { projectIdsAndTokens: [{ projectId: "projA", token: "t" }] },
    });
    const res = mkRes();

    await buildLatestRevisionLoaderRedirect(req, res);

    expectRedirect(res, expect.any(String));
    expect(res.headers["cache-control"]).toEqual("private, no-store");
  });

  it("ignores pkg version tags that aren't branches", async () => {
    const req = mkReq({
      query: { loaderVersion: "10", projectId: "projA@prod" },
      headers: { host: "codegen.plasmic.app" },
    });
    await buildLatestRevisionLoaderRedirect(req, mkRes());
    expect(mgr.getLatestProjectRevRef).toHaveBeenCalledWith("projA", {
      branchId: undefined,
    });
  });

  it("redirects codegen-origin requests to the CDN host", async () => {
    const res = mkRes();
    await buildLatestRevisionLoaderRedirect(
      mkReq({
        query: { loaderVersion: "10", projectId: "projA" },
        headers: { host: "codegen-origin.plasmic.app" },
      }),
      res,
    );
    expectRedirect(
      res,
      `https://codegen.plasmic.app/api/v1/loader/code/revision?cb=${LOADER_CACHE_BUST}&platform=react&loaderVersion=10&projectId=projA%40rev%3AprojA-main-rev`,
    );
  });

  it("requires loaderVersion in the query", async () => {
    await expect(
      buildLatestRevisionLoaderRedirect(
        mkReq({
          query: { projectId: "projA" },
          headers: {
            host: "codegen.plasmic.app",
            "x-plasmic-loader-version": "9",
          },
        }),
        mkRes(),
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it("answers 200 with a relative redirectUrl for the polyfill project", async () => {
    const projectId = _testonly.ANGULAR_POLYFILL_PROJECT_ID;
    const res = mkRes();
    await buildLatestRevisionLoaderRedirect(
      mkReq({
        query: { loaderVersion: "10", projectId },
        headers: { host: "codegen-origin.plasmic.app" },
      }),
      res,
    );
    expect(res.location).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      redirectUrl: `/api/v1/loader/code/revision?cb=${LOADER_CACHE_BUST}&platform=react&loaderVersion=10&projectId=${projectId}%40rev%3A${projectId}-main-rev`,
    });
    expect(res.headers["cache-control"]).toEqual(
      "public, max-age=0, s-maxage=5",
    );
    expect(res.headers.vary).toEqual("x-plasmic-api-project-tokens");
  });

  it("doesn't redirect when the perm check fails", async () => {
    mgr.checkProjectPerms.mockRejectedValue(new Error("forbidden"));
    const res = mkRes();
    await expect(
      buildLatestRevisionLoaderRedirect(
        mkReq({ query: { loaderVersion: "10", projectId: "projA" } }),
        res,
      ),
    ).rejects.toThrow("forbidden");
    expect(mgr.getLatestProjectRevRef).not.toHaveBeenCalled();
    expect(res.location).not.toHaveBeenCalled();
    expect(res.headers["cache-control"]).toBeUndefined();
  });
});

describe("buildRevisionLoaderAssets", () => {
  const bundle = { modules: [], bundleKey: null };

  beforeEach(() => {
    vi.mocked(genRevisionLoaderCodeBundle).mockReset();
    vi.mocked(genRevisionLoaderCodeBundle).mockResolvedValue(
      bundle as unknown as Awaited<
        ReturnType<typeof genRevisionLoaderCodeBundle>
      >,
    );
  });

  it("serves the bundle for the pinned revisions with cache headers", async () => {
    const req = mkReq({
      query: {
        cb: LOADER_CACHE_BUST,
        platform: "nextjs",
        nextjsAppDir: "true",
        loaderVersion: "10",
        projectId: ["projA@rev:rev1", "projB@rev:rev2"],
        browserOnly: "true",
      },
    });
    const res = mkRes();

    await buildRevisionLoaderAssets(req, res);

    expect(mgr.checkProjectPerms).toHaveBeenCalledWith(
      "projA",
      "viewer",
      "get",
    );
    expect(mgr.checkProjectPerms).toHaveBeenCalledWith(
      "projB",
      "viewer",
      "get",
    );
    expect(mgr.getProjectRevRefByIdForProject).toHaveBeenCalledWith(
      "projA",
      "rev1",
    );
    expect(mgr.getProjectRevRefByIdForProject).toHaveBeenCalledWith(
      "projB",
      "rev2",
    );
    expect(genRevisionLoaderCodeBundle).toHaveBeenCalledExactlyOnceWith(
      mgr,
      req.workerpool,
      {
        source: "live",
        platform: "nextjs",
        platformOptions: { nextjs: { appDir: true } },
        projectRevisions: { projA: "rev1", projB: "rev2" },
        loaderVersion: 10,
        browserOnly: true,
        i18nKeyScheme: undefined,
        i18nTagPrefix: undefined,
        skipHead: undefined,
      },
    );
    expect(res.type).toHaveBeenCalledWith("json");
    expect(res.send).toHaveBeenCalledExactlyOnceWith(
      Buffer.from(JSON.stringify(bundle)),
    );
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.headers["cache-control"]).toEqual(
      "max-age=3600, s-maxage=31536000",
    );
    expect(res.headers.vary).toEqual(
      "x-plasmic-api-project-tokens, Accept-Encoding",
    );
    expect(req.promLabels.projectId).toEqual("projA,projB");
    expect(req.analytics.track).toHaveBeenCalledWith(
      "Codegen",
      expect.objectContaining({ versionType: "revision" }),
      expect.anything(),
    );
  });

  it("keeps a bundle authorized by a session private", async () => {
    const req = mkReq({
      query: { loaderVersion: "10", projectId: "projA@rev:rev1" },
      user: { id: "user1" },
    });
    const res = mkRes();

    await buildRevisionLoaderAssets(req, res);

    expect(res.send).toHaveBeenCalledOnce();
    expect(res.headers["cache-control"]).toEqual("private, no-store");
  });

  it("keeps a bundle authorized by body tokens private", async () => {
    const req = mkReq({
      query: { loaderVersion: "10", projectId: "projA@rev:rev1" },
      body: { projectIdsAndTokens: [{ projectId: "projA", token: "t" }] },
    });
    const res = mkRes();

    await buildRevisionLoaderAssets(req, res);

    expect(res.send).toHaveBeenCalledOnce();
    expect(res.headers["cache-control"]).toEqual("private, no-store");
  });

  it("gzips the bundle when the client accepts gzip", async () => {
    const req = mkReq({
      query: { loaderVersion: "10", projectId: "projA@rev:rev1" },
      acceptsGzip: true,
    });
    const res = mkRes();

    await buildRevisionLoaderAssets(req, res);

    expect(res.headers["content-encoding"]).toEqual("gzip");
    const body = res.send.mock.calls[0][0] as Buffer;
    expect(JSON.parse(gunzipSync(body).toString())).toEqual(bundle);
  });

  it("404s a revision that isn't in the project or is soft-deleted", async () => {
    mgr.getProjectRevRefByIdForProject.mockRejectedValue(
      new DbNotFoundError("Revision rev1 of project projA not found"),
    );
    const res = mkRes();
    await expect(
      buildRevisionLoaderAssets(
        mkReq({ query: { loaderVersion: "10", projectId: "projA@rev:rev1" } }),
        res,
      ),
    ).rejects.toThrow(DbNotFoundError);
    expect(genRevisionLoaderCodeBundle).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  it("checks perms before looking up revisions", async () => {
    mgr.checkProjectPerms.mockRejectedValue(new Error("forbidden"));
    await expect(
      buildRevisionLoaderAssets(
        mkReq({ query: { loaderVersion: "10", projectId: "projA@rev:rev1" } }),
        mkRes(),
      ),
    ).rejects.toThrow("forbidden");
    expect(mgr.getProjectRevRefByIdForProject).not.toHaveBeenCalled();
    expect(genRevisionLoaderCodeBundle).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing loaderVersion query", { projectId: "projA@rev:rev1" }],
    [
      "a non-numeric loaderVersion",
      { loaderVersion: "x", projectId: "projA@rev:rev1" },
    ],
    ["a non-revision spec", { loaderVersion: "10", projectId: "projA@1.0.0" }],
    ["a bare project id", { loaderVersion: "10", projectId: "projA" }],
    [
      "a duplicate project",
      { loaderVersion: "10", projectId: ["projA@rev:rev1", "projA@rev:rev2"] },
    ],
    ["no projectId", { loaderVersion: "10" }],
  ])("rejects %s with 400", async (_, query) => {
    await expect(
      buildRevisionLoaderAssets(mkReq({ query }), mkRes()),
    ).rejects.toThrow(BadRequestError);
    expect(genRevisionLoaderCodeBundle).not.toHaveBeenCalled();
  });
});
