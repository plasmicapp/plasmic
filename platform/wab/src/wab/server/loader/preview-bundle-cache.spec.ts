/** @vitest-environment node */
import { PreviewBundleCache } from "@/wab/server/loader/preview-bundle-cache";
import { makePreviewBundleCacheKeys } from "@/wab/server/routes/loader";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setImmediate(r));

describe("PreviewBundleCache", () => {
  let now = 0;
  const makeCache = (maxBytes = 1000) =>
    new PreviewBundleCache({ maxBytes, now: () => now });

  beforeEach(() => {
    now = 0;
  });

  it("shares one build between concurrent requests for the same key", async () => {
    const cache = makeCache();
    const d = deferred<unknown>();
    const compute = vi.fn(() => d.promise);

    const a = cache.get({ lane: "L", key: "K", ttlMs: 0, compute });
    const b = cache.get({ lane: "L", key: "K", ttlMs: 0, compute });
    await flush();
    d.resolve({ x: 1 });

    expect(await a).toEqual({
      body: Buffer.from('{"x":1}'),
      source: "computed",
    });
    expect((await b).source).toBe("joined");
    expect((await b).body).toBe((await a).body);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("reuses a finished build until the TTL ends", async () => {
    const cache = makeCache();
    const compute = vi.fn(async () => ({ x: 1 }));

    await cache.get({ lane: "L", key: "K", ttlMs: 100, compute });
    now = 99;
    expect(
      (await cache.get({ lane: "L", key: "K", ttlMs: 100, compute })).source,
    ).toBe("cache");
    now = 100;
    expect(
      (await cache.get({ lane: "L", key: "K", ttlMs: 100, compute })).source,
    ).toBe("computed");
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("bypasses a finished body for probes and joins a running probe", async () => {
    const cache = makeCache();
    const next = deferred<string>();
    const args = {
      lane: "L",
      key: "K",
      ttlMs: 100,
      compute: () => next.promise,
    };
    await cache.get({ ...args, compute: async () => "old" });

    const probe = cache.get({ ...args, skipFinished: true });
    const secondProbe = cache.get({ ...args, skipFinished: true });
    const ordinary = cache.get(args);
    next.resolve("fresh");
    expect(await probe).toEqual({
      source: "computed",
      body: Buffer.from('"fresh"'),
    });
    for (const joined of [secondProbe, ordinary]) {
      expect(await joined).toEqual({
        source: "joined",
        body: Buffer.from('"fresh"'),
      });
    }
  });

  it("discards a build when the TTL is disabled before it finishes", async () => {
    const cache = makeCache();
    let ttlMs = 100;
    const args = {
      lane: "L",
      key: "K",
      compute: async () => "bundle",
      getTtlAfterBuild: async () => ttlMs,
    };
    const next = deferred<string>();
    const pending = cache.get({ ...args, ttlMs, compute: () => next.promise });
    await flush();
    ttlMs = 0;
    next.resolve("discard");
    expect((await pending).source).toBe("computed");
    ttlMs = 100;
    expect((await cache.get({ ...args, ttlMs })).source).toBe("computed");
  });

  it("runs builds in one lane one after another", async () => {
    const cache = makeCache();
    const first = deferred<unknown>();
    const second = vi.fn(async () => "rev2");

    const a = cache.get({
      lane: "L",
      key: "rev1",
      ttlMs: 0,
      compute: () => first.promise,
    });
    const b = cache.get({ lane: "L", key: "rev2", ttlMs: 0, compute: second });
    await flush();
    expect(second).not.toHaveBeenCalled();

    first.resolve("rev1");
    expect((await a).body).toEqual(Buffer.from('"rev1"'));
    expect((await b).body).toEqual(Buffer.from('"rev2"'));
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("runs builds in different lanes at the same time", async () => {
    const cache = makeCache();
    const first = deferred<unknown>();
    const other = vi.fn(async () => "other");

    const a = cache.get({
      lane: "L1",
      key: "K1",
      ttlMs: 0,
      compute: () => first.promise,
    });
    expect(
      (await cache.get({ lane: "L2", key: "K2", ttlMs: 0, compute: other }))
        .body,
    ).toEqual(Buffer.from('"other"'));
    first.resolve("done");
    await a;
  });

  it("fails all joined requests but not the next build in the lane", async () => {
    const cache = makeCache();
    const failing = deferred<unknown>();

    const a = cache.get({
      lane: "L",
      key: "K1",
      ttlMs: 100,
      compute: () => failing.promise,
    });
    const b = cache.get({
      lane: "L",
      key: "K1",
      ttlMs: 100,
      compute: () => failing.promise,
    });
    const c = cache.get({
      lane: "L",
      key: "K2",
      ttlMs: 100,
      compute: async () => "ok",
    });
    failing.reject(new Error("boom"));

    await expect(a).rejects.toThrow("boom");
    await expect(b).rejects.toThrow("boom");
    expect((await c).body).toEqual(Buffer.from('"ok"'));

    // The failure is not cached.
    const retry = await cache.get({
      lane: "L",
      key: "K1",
      ttlMs: 100,
      compute: async () => "retried",
    });
    expect(retry).toEqual({
      body: Buffer.from('"retried"'),
      source: "computed",
    });
  });

  it("evicts the oldest entries to stay under maxBytes", async () => {
    const cache = makeCache(10);
    const get = (key: string, value: string) =>
      cache.get({ lane: key, key, ttlMs: 100, compute: async () => value });

    await get("A", "aaaa"); // '"aaaa"' = 6
    await get("B", "bbb"); // 5, total 11 > 10, so A is evicted
    expect((await get("B", "x")).source).toBe("cache");
    expect((await get("A", "aaaa")).source).toBe("computed");
  });

  it("does not store a body larger than maxBytes", async () => {
    const cache = makeCache(3);
    const compute = vi.fn(async () => "é");
    await cache.get({ lane: "L", key: "K", ttlMs: 100, compute });
    await cache.get({ lane: "L", key: "K", ttlMs: 100, compute });
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

describe("makePreviewBundleCacheKeys", () => {
  const options = { platform: "nextjs", loaderVersion: 10 };

  it("gives the same lane but different keys for different revisions", () => {
    const projectIdsBranches = [{ id: "p1", branchName: undefined }];
    const r1 = makePreviewBundleCacheKeys({
      projectIdsBranches,
      projectRevs: { p1: 1 },
      options,
    });
    const r2 = makePreviewBundleCacheKeys({
      projectIdsBranches,
      projectRevs: { p1: 2 },
      options,
    });
    expect(r1.lane).toBe(r2.lane);
    expect(r1.key).not.toBe(r2.key);
  });

  it("ignores project order", () => {
    const projectRevs = { p1: 1, p2: 5 };
    const a = makePreviewBundleCacheKeys({
      projectIdsBranches: [
        { id: "p1", branchName: undefined },
        { id: "p2", branchName: "b" },
      ],
      projectRevs,
      options,
    });
    const b = makePreviewBundleCacheKeys({
      projectIdsBranches: [
        { id: "p2", branchName: "b" },
        { id: "p1", branchName: undefined },
      ],
      projectRevs,
      options,
    });
    expect(a).toEqual(b);
  });

  it("separates branches and options", () => {
    const projectRevs = { p1: 1 };
    const main = makePreviewBundleCacheKeys({
      projectIdsBranches: [{ id: "p1", branchName: undefined }],
      projectRevs,
      options,
    });
    const branch = makePreviewBundleCacheKeys({
      projectIdsBranches: [{ id: "p1", branchName: "b" }],
      projectRevs,
      options,
    });
    const browserOnly = makePreviewBundleCacheKeys({
      projectIdsBranches: [{ id: "p1", branchName: undefined }],
      projectRevs,
      options: { ...options, browserOnly: true },
    });
    expect(new Set([main.lane, branch.lane, browserOnly.lane]).size).toBe(3);
  });
});
