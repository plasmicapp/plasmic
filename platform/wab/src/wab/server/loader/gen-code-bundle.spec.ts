import type { DbMgr } from "@/wab/server/db/DbMgr";
import {
  _testonly,
  extractBundleKeyProjectIds,
  genPublishedLoaderCodeBundle,
  LATEST_LOADER_VERSION,
  LOADER_CODEGEN_OPTS_DEFAULTS,
} from "@/wab/server/loader/gen-code-bundle";
import { resolveProjectDeps } from "@/wab/server/loader/resolve-projects";
import { loaderBundleCacheCounter } from "@/wab/server/promstats";
import type { PlasmicWorkerPool } from "@/wab/server/workers/pool";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";

const s3 = vi.hoisted(() => {
  const objects = new Map<string, string>();
  const getObject = vi.fn(({ Key }: { Key: string }) => ({
    promise: async () => {
      const body = objects.get(Key);
      if (body === undefined) {
        throw Object.assign(new Error("NoSuchKey"), { code: "NoSuchKey" });
      }
      return { Body: Buffer.from(body) };
    },
  }));
  const putObject = vi.fn(({ Key, Body }: { Key: string; Body: string }) => ({
    promise: async () => void objects.set(Key, Body),
  }));
  return {
    objects,
    getObject,
    putObject,
    S3: vi.fn(function () {
      return { getObject, putObject };
    }),
  };
});

vi.mock("aws-sdk/clients/s3", () => ({ default: s3.S3 }));
vi.mock("@/wab/server/db/DbCon", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSerializableConnectionOptions: () => ({}),
}));
vi.mock("@/wab/server/loader/resolve-projects", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveProjectDeps: vi.fn(),
}));
vi.mock("@/wab/server/workers/worker-utils", () => ({
  ensureDevFlags: vi.fn(),
}));

const BASE_OPTS = {
  platformOptions: {},
  i18nTagPrefix: undefined,
} as const;

describe("makeExportOpts", () => {
  it("defaults platform to react when not specified", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 1 });
    expect(opts.platform).toBe("react");
  });

  it("gates useCodeComponentHelpersRegistry on loaderVersion", () => {
    const v9 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 9 });
    expect(v9.useCodeComponentHelpersRegistry).toBe(false);

    const v10 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 10 });
    expect(v10.useCodeComponentHelpersRegistry).toBe(true);
  });

  it("always enables the substitution apis", () => {
    for (const loaderVersion of [1, LATEST_LOADER_VERSION]) {
      const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion });
      expect(opts.useComponentSubstitutionApi).toBe(true);
      expect(opts.useGlobalVariantsSubstitutionApi).toBe(true);
    }
  });

  it("includes localization when i18nKeyScheme is provided", () => {
    const opts = _testonly.makeExportOpts({
      ...BASE_OPTS,
      loaderVersion: 1,
      i18nKeyScheme: "hash",
      i18nTagPrefix: "x-",
    });
    expect(opts.localization).toEqual({ keyScheme: "hash", tagPrefix: "x-" });
  });

  it("omits localization when i18nKeyScheme is not provided", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 1 });
    expect(opts.localization).toBeUndefined();
  });

  it("only overrides the defaults it is documented to override", () => {
    const opts = _testonly.makeExportOpts({
      ...BASE_OPTS,
      loaderVersion: LATEST_LOADER_VERSION,
    });
    expect(opts).toEqual({
      ...LOADER_CODEGEN_OPTS_DEFAULTS,
      platformOptions: {},
      useComponentSubstitutionApi: true,
      useGlobalVariantsSubstitutionApi: true,
      useCodeComponentHelpersRegistry: true,
      skipHead: undefined,
    });
  });
});

describe("genPublishedLoaderCodeBundle", () => {
  const CALL_OPTS = {
    source: "live",
    platformOptions: {},
    projectVersions: { proj1: { version: "1.0.0", indirect: false } },
    loaderVersion: LATEST_LOADER_VERSION,
    browserOnly: false,
    i18nKeyScheme: undefined,
    i18nTagPrefix: undefined,
  } as const;

  let dbMgr: DbMgr;
  let pool: PlasmicWorkerPool;

  beforeEach(() => {
    s3.objects.clear();
    // `restoreMocks` wipes the implementations set at creation time.
    s3.getObject.mockImplementation(({ Key }) => ({
      promise: async () => {
        const body = s3.objects.get(Key);
        if (body === undefined) {
          throw Object.assign(new Error("NoSuchKey"), { code: "NoSuchKey" });
        }
        return { Body: Buffer.from(body) };
      },
    }));
    s3.putObject.mockImplementation(({ Key, Body }) => ({
      promise: async () => void s3.objects.set(Key, Body),
    }));
    s3.S3.mockImplementation(function () {
      return { getObject: s3.getObject, putObject: s3.putObject };
    });

    vi.mocked(resolveProjectDeps).mockResolvedValue({});
    dbMgr = {
      listBranchesForProject: vi.fn().mockResolvedValue([]),
    } as unknown as DbMgr;
    pool = {
      exec: vi.fn(async (method: string) =>
        method === "codegen"
          ? { output: {}, componentDeps: {}, componentRefs: [] }
          : { modules: [], bundleKey: null }
      ),
    } as unknown as PlasmicWorkerPool;
  });

  function s3GetKeys() {
    return s3.getObject.mock.calls.map(([{ Key }]) => Key);
  }

  it("probes the same bundle key that the full path ends up writing", async () => {
    await genPublishedLoaderCodeBundle(dbMgr, pool, CALL_OPTS);

    const writtenBundleKey = s3.putObject.mock.calls
      .map(([{ Key }]) => Key)
      .find((key) => key.startsWith("bundle/"));
    // The probe is the very first read, before any dep resolution or codegen.
    expect(s3GetKeys()[0]).toEqual(writtenBundleKey);
  });

  it("returns the cached bundle and skips dep resolution and codegen on a hit", async () => {
    // Populate the cache via a full run, then replay the same request.
    const firstResult = await genPublishedLoaderCodeBundle(
      dbMgr,
      pool,
      CALL_OPTS
    );
    for (const mock of [
      resolveProjectDeps,
      ensureDevFlags,
      pool.exec,
      dbMgr.listBranchesForProject,
      s3.getObject,
    ]) {
      vi.mocked(mock).mockClear();
    }

    const inc = vi.spyOn(loaderBundleCacheCounter, "inc");
    const result = await genPublishedLoaderCodeBundle(dbMgr, pool, CALL_OPTS);

    expect(result).toEqual(firstResult);
    expect(result.bundleKey).toEqual(s3GetKeys()[0]);
    expect(s3GetKeys()).toHaveLength(1);
    expect(resolveProjectDeps).not.toHaveBeenCalled();
    expect(ensureDevFlags).not.toHaveBeenCalled();
    expect(pool.exec).not.toHaveBeenCalled();
    expect(dbMgr.listBranchesForProject).not.toHaveBeenCalled();
    // The fast path still has to account for the hit it just served.
    expect(inc).toHaveBeenCalledExactlyOnceWith({
      result: "hit",
      source: "live",
    });
  });

  it("falls through to the full path when the probe misses", async () => {
    await genPublishedLoaderCodeBundle(dbMgr, pool, CALL_OPTS);

    expect(resolveProjectDeps).toHaveBeenCalled();
    expect(ensureDevFlags).toHaveBeenCalled();
    expect(pool.exec).toHaveBeenCalledWith("loader-assets", expect.anything());
  });

  it("does not reuse a bundle cached under different loader options", async () => {
    await genPublishedLoaderCodeBundle(dbMgr, pool, CALL_OPTS);
    const firstProbe = s3GetKeys()[0];
    s3.getObject.mockClear();
    vi.mocked(pool.exec).mockClear();

    await genPublishedLoaderCodeBundle(dbMgr, pool, {
      ...CALL_OPTS,
      browserOnly: true,
    });

    expect(s3GetKeys()[0]).not.toEqual(firstProbe);
    expect(pool.exec).toHaveBeenCalledWith("loader-assets", expect.anything());
    expect(
      [...s3.objects.keys()].filter((key) => key.startsWith("bundle/"))
    ).toHaveLength(2);
  });
});

describe("makeBundleBucketPath/extractBundleKeyProjectIds", () => {
  it("should work", () => {
    const bundleKey = _testonly.makeBundleBucketPath({
      projectVersions: {
        p1: { version: "10.0.0", indirect: false },
        p2: { version: "1.2.3", indirect: false },
        p3: { version: "0.0.1", indirect: true },
      },
      platform: "react",
      loaderVersion: 7,
      browserOnly: true,
      exportOpts: LOADER_CODEGEN_OPTS_DEFAULTS,
    });
    expect(bundleKey).toEqual(
      "bundle/cb=22/loaderVersion=7/ps=p1@10.0.0,p2@1.2.3/platform=react/browserOnly=true/opts=22a86211efc9ac67440fb332014652a6010e993f48c3068b936afe2128f03e3c"
    );
    expect(extractBundleKeyProjectIds(bundleKey)).toEqual(["p1", "p2"]);
  });
});
