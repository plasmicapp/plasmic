import type { DbMgr } from "@/wab/server/db/DbMgr";
import {
  _testonly,
  extractBundleKeyProjectIds,
  genPublishedLoaderCodeBundle,
  genRevisionLoaderCodeBundle,
  isChunkableBundleKey,
  LATEST_LOADER_VERSION,
  LOADER_CODEGEN_OPTS_DEFAULTS,
} from "@/wab/server/loader/gen-code-bundle";
import {
  mkRevisionToSync,
  resolveProjectDeps,
} from "@/wab/server/loader/resolve-projects";
import {
  loaderBundleCacheCounter,
  loaderCodegenCacheCounter,
} from "@/wab/server/promstats";
import type { PlasmicWorkerPool } from "@/wab/server/workers/pool";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";

const s3 = vi.hoisted(() => {
  const objects = new Map<string, string>();
  const getObject = vi.fn(({ Key }: { Key: string }) => async () => {
    const body = objects.get(Key);
    if (body === undefined) {
      throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
    }
    return { Body: { transformToString: async () => body } };
  });
  const putObject = vi.fn(
    ({ Key, Body }: { Key: string; Body: string }) =>
      async () =>
        void objects.set(Key, Body),
  );
  const GetObjectCommand = vi.fn(function (input: { Key: string }) {
    return { run: getObject(input) };
  });
  const PutObjectCommand = vi.fn(function (input: {
    Key: string;
    Body: string;
  }) {
    return { run: putObject(input) };
  });
  return {
    objects,
    getObject,
    putObject,
    GetObjectCommand,
    PutObjectCommand,
    S3Client: vi.fn(function () {
      return {
        send: (command: { run: () => Promise<unknown> }) => command.run(),
      };
    }),
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3.S3Client,
  GetObjectCommand: s3.GetObjectCommand,
  PutObjectCommand: s3.PutObjectCommand,
}));
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
    s3.getObject.mockImplementation(({ Key }) => async () => {
      const body = s3.objects.get(Key);
      if (body === undefined) {
        throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
      }
      return { Body: { transformToString: async () => body } };
    });
    s3.putObject.mockImplementation(
      ({ Key, Body }) =>
        async () =>
          void s3.objects.set(Key, Body),
    );
    s3.GetObjectCommand.mockImplementation(function (input) {
      return { run: s3.getObject(input) };
    });
    s3.PutObjectCommand.mockImplementation(function (input) {
      return { run: s3.putObject(input) };
    });
    s3.S3Client.mockImplementation(function () {
      return {
        send: (command: { run: () => Promise<unknown> }) => command.run(),
      };
    });

    vi.mocked(resolveProjectDeps).mockResolvedValue({});
    dbMgr = {
      listBranchesForProject: vi.fn().mockResolvedValue([]),
    } as unknown as DbMgr;
    pool = {
      exec: vi.fn(async (method: string) =>
        method === "codegen"
          ? { output: {}, componentDeps: {}, componentRefs: [] }
          : { modules: [], bundleKey: null },
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
      CALL_OPTS,
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
      kind: "published",
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
      [...s3.objects.keys()].filter((key) => key.startsWith("bundle/")),
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
      mode: "production",
      exportOpts: LOADER_CODEGEN_OPTS_DEFAULTS,
    });
    expect(bundleKey).toEqual(
      "bundle/cb=23/loaderVersion=7/ps=p1@10.0.0,p2@1.2.3/platform=react/browserOnly=true/opts=22a86211efc9ac67440fb332014652a6010e993f48c3068b936afe2128f03e3c",
    );
    expect(extractBundleKeyProjectIds(bundleKey)).toEqual(["p1", "p2"]);
  });
});

describe("revision cache keys", () => {
  const exportOpts = LOADER_CODEGEN_OPTS_DEFAULTS;

  it("keys revision bundles on mode=development and the revision ids", () => {
    const bundleKey = _testonly.makeBundleBucketPath({
      projectVersions: {
        p2: mkRevisionToSync("rev2"),
        p1: mkRevisionToSync("rev1"),
        p3: { version: "0.0.1", indirect: true },
      },
      platform: "react",
      loaderVersion: 10,
      browserOnly: false,
      mode: "development",
      exportOpts,
    });
    expect(bundleKey).toStartWith(
      "bundle/cb=23/mode=development/loaderVersion=10/ps=p1@rev:rev1,p2@rev:rev2/platform=react/browserOnly=false/opts=",
    );
    expect(extractBundleKeyProjectIds(bundleKey)).toEqual(["p1", "p2"]);
  });

  it("serves /chunks only for production bundle keys", () => {
    const opts = {
      projectVersions: { p1: mkRevisionToSync("rev1") },
      platform: "react",
      loaderVersion: 10,
      browserOnly: false,
      exportOpts,
    };
    expect(
      isChunkableBundleKey(
        _testonly.makeBundleBucketPath({ ...opts, mode: "production" }),
      ),
    ).toBe(true);
    expect(
      isChunkableBundleKey(
        _testonly.makeBundleBucketPath({ ...opts, mode: "development" }),
      ),
    ).toBe(false);
  });

  it("keys revision codegen on rev=<revisionId>", () => {
    expect(
      _testonly.makeCodegenBucketPath({
        projectId: "p1",
        version: mkRevisionToSync("rev1"),
        exportOpts,
      }),
    ).toStartWith("codegen/cb=23/pid=p1/rev=rev1/indirect=false/opts=");
    expect(
      _testonly.makeCodegenBucketPath({
        projectId: "p1",
        version: { version: "1.0.0", indirect: true },
        exportOpts,
      }),
    ).toStartWith("codegen/cb=23/pid=p1/v=1.0.0/indirect=true/opts=");
  });
});

describe("genRevisionLoaderCodeBundle", () => {
  const CALL_OPTS = {
    source: "live",
    platformOptions: {},
    projectRevisions: { proj1: "rev1" },
    loaderVersion: LATEST_LOADER_VERSION,
    browserOnly: false,
    i18nKeyScheme: undefined,
    i18nTagPrefix: undefined,
  } as const;

  let dbMgr: DbMgr;
  let pool: PlasmicWorkerPool;

  beforeEach(() => {
    s3.objects.clear();
    s3.getObject.mockImplementation(({ Key }) => async () => {
      const body = s3.objects.get(Key);
      if (body === undefined) {
        throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
      }
      return { Body: { transformToString: async () => body } };
    });
    s3.putObject.mockImplementation(
      ({ Key, Body }) =>
        async () =>
          void s3.objects.set(Key, Body),
    );
    s3.GetObjectCommand.mockImplementation(function (input) {
      return { run: s3.getObject(input) };
    });
    s3.PutObjectCommand.mockImplementation(function (input) {
      return { run: s3.putObject(input) };
    });
    s3.S3Client.mockImplementation(function () {
      return {
        send: (command: { run: () => Promise<unknown> }) => command.run(),
      };
    });

    s3.getObject.mockClear();
    s3.putObject.mockClear();
    vi.mocked(resolveProjectDeps).mockClear();

    vi.mocked(resolveProjectDeps).mockResolvedValue({
      dep1: { version: "2.0.0", indirect: true },
    });
    dbMgr = {
      listBranchesForProject: vi.fn().mockResolvedValue([]),
    } as unknown as DbMgr;
    pool = {
      exec: vi.fn(async (method: string) =>
        method === "codegen"
          ? { output: {}, componentDeps: {}, componentRefs: [] }
          : { modules: [], bundleKey: null },
      ),
    } as unknown as PlasmicWorkerPool;
  });

  function s3Keys(mock: typeof s3.getObject | typeof s3.putObject) {
    return mock.mock.calls.map(([{ Key }]) => Key);
  }

  it("generates a development bundle pinned to the revision and caches it", async () => {
    const bundleInc = vi.spyOn(loaderBundleCacheCounter, "inc");
    const codegenInc = vi.spyOn(loaderCodegenCacheCounter, "inc");

    const result = await genRevisionLoaderCodeBundle(dbMgr, pool, CALL_OPTS);

    expect(resolveProjectDeps).toHaveBeenCalledWith(dbMgr, {
      proj1: { revisionId: "rev1", indirect: false },
    });
    expect(pool.exec).toHaveBeenCalledWith("codegen", [
      expect.objectContaining({
        projectId: "proj1",
        revisionId: "rev1",
        indirect: false,
      }),
    ]);
    expect(pool.exec).toHaveBeenCalledWith("codegen", [
      expect.objectContaining({
        projectId: "dep1",
        maybeVersionOrTag: "2.0.0",
        revisionId: undefined,
        indirect: true,
      }),
    ]);
    expect(pool.exec).toHaveBeenCalledWith("loader-assets", [
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "react",
      expect.objectContaining({ mode: "development" }),
    ]);

    const putKeys = s3Keys(s3.putObject);
    expect(putKeys).toContainEqual(
      expect.stringMatching(/^codegen\/cb=23\/pid=proj1\/rev=rev1\//),
    );
    expect(putKeys).toContainEqual(
      expect.stringMatching(/^codegen\/cb=23\/pid=dep1\/v=2\.0\.0\//),
    );
    const bundleKey = putKeys.find((key) => key.startsWith("bundle/"));
    expect(bundleKey).toStartWith(
      "bundle/cb=23/mode=development/loaderVersion=10/ps=proj1@rev:rev1/",
    );
    expect(s3Keys(s3.getObject)[0]).toEqual(bundleKey);

    expect(result.bundleKey).toBeNull();

    expect(bundleInc).toHaveBeenCalledWith({
      result: "miss",
      source: "live",
      kind: "revision",
    });
    expect(codegenInc).toHaveBeenCalledWith({
      result: "miss",
      source: "live",
      kind: "revision",
    });
    expect(dbMgr.listBranchesForProject).not.toHaveBeenCalledWith("proj1");
  });

  it("serves a cached revision bundle without codegen", async () => {
    await genRevisionLoaderCodeBundle(dbMgr, pool, CALL_OPTS);
    vi.mocked(pool.exec).mockClear();
    vi.mocked(resolveProjectDeps).mockClear();
    const inc = vi.spyOn(loaderBundleCacheCounter, "inc");

    const result = await genRevisionLoaderCodeBundle(dbMgr, pool, CALL_OPTS);

    expect(pool.exec).not.toHaveBeenCalled();
    expect(resolveProjectDeps).not.toHaveBeenCalled();
    expect(result.bundleKey).toBeNull();
    expect(inc).toHaveBeenCalledExactlyOnceWith({
      result: "hit",
      source: "live",
      kind: "revision",
    });
  });

  it("caches each revision separately", async () => {
    await genRevisionLoaderCodeBundle(dbMgr, pool, CALL_OPTS);
    await genRevisionLoaderCodeBundle(dbMgr, pool, {
      ...CALL_OPTS,
      projectRevisions: { proj1: "rev2" },
    });
    expect(
      [...s3.objects.keys()].filter((key) => key.startsWith("bundle/")),
    ).toHaveLength(2);
  });
});
