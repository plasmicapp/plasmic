import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Api, LoaderBundleOutput } from "./api";
import {
  FetcherOptions,
  PlasmicModulesFetcher,
  internal_getCachedBundleInNodeServer,
  internal_setPreviewMinRev,
} from "./fetcher";

const FETCHER_OPTIONS: FetcherOptions = {
  projects: [
    {
      id: "projA",
      token: "tokenA",
    },
    {
      id: "projB",
      token: "tokenB",
      version: "1.0.0",
    },
  ],
};

describe("PlasmicModulesFetcher", () => {
  describe("Node server bundle cache", () => {
    beforeEach(() => {
      vi.stubGlobal("__PLASMIC_BUNDLES", undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it.each([
      [
        "API host",
        { preview: true, apiHost: "https://one.example" },
        { preview: true, apiHost: "https://two.example" },
      ],
      [
        "CDN host",
        { cdnHost: "https://one.example" },
        { cdnHost: "https://two.example" },
      ],
      [
        "translation prefix",
        { i18n: { keyScheme: "content", tagPrefix: "one" } },
        { i18n: { keyScheme: "content", tagPrefix: "two" } },
      ],
      [
        "Next.js app router",
        { platform: "nextjs", platformOptions: { nextjs: { appDir: true } } },
        { platform: "nextjs", platformOptions: { nextjs: { appDir: false } } },
      ],
    ] satisfies [string, Partial<FetcherOptions>, Partial<FetcherOptions>][])(
      "keeps Node server bundles separate by %s",
      async (_label, optionA, optionB) => {
        const optsA = { ...FETCHER_OPTIONS, ...optionA };
        const optsB = { ...FETCHER_OPTIONS, ...optionB };
        const fetcherA = new PlasmicModulesFetcher(optsA);
        const fetcherB = new PlasmicModulesFetcher(optsB);
        const bundleA: LoaderBundleOutput = {
          projects: [],
          modules: { browser: [], server: [] },
          components: [],
          globalGroups: [],
          activeSplits: [],
          bundleKey: "A",
          filteredIds: {},
          deferChunksByDefault: false,
          disableRootLoadingBoundaryByDefault: false,
        };
        const bundleB = { ...bundleA, bundleKey: "B" };
        vi.spyOn(Api.prototype, "fetchLoaderData")
          .mockResolvedValueOnce(bundleA)
          .mockResolvedValueOnce(bundleB);
        await fetcherA.fetchAllData();
        expect(internal_getCachedBundleInNodeServer(optsB)).toBeUndefined();
        await fetcherB.fetchAllData();
        expect(internal_getCachedBundleInNodeServer(optsA)).toBe(bundleA);
        expect(internal_getCachedBundleInNodeServer(optsB)).toBe(bundleB);
        expect(internal_getCachedBundleInNodeServer({ ...optsA })).toBe(
          bundleA,
        );
      },
    );
  });

  describe("getCachedOrFetch", () => {
    it("should properly clean up curFetch in successful request", async () => {
      const fetcher = new PlasmicModulesFetcher(FETCHER_OPTIONS);
      const fetchLoaderData = vi.fn().mockResolvedValue({
        projects: [],
      });
      fetcher.api = {
        fetchLoaderData,
      };
      await fetcher.fetchAllData();
      expect(fetchLoaderData).toHaveBeenCalledWith(
        ["projA", "projB@1.0.0"],
        expect.anything(),
      );
      expect(fetcher.curFetch).toBeUndefined();
    });

    it("should properly clean up curFetch in unsuccessful request", async () => {
      const fetcher = new PlasmicModulesFetcher(FETCHER_OPTIONS);
      const fetchLoaderData = vi.fn().mockRejectedValue(new Error("error"));
      fetcher.api = {
        fetchLoaderData,
      };
      try {
        await fetcher.fetchAllData();
      } catch (e) {
        // ignore
      }
      // await expect(fetcher.fetchAllData()).rejects.toThrow("error");
      expect(fetchLoaderData).toHaveBeenCalledWith(
        ["projA", "projB@1.0.0"],
        expect.anything(),
      );
      expect(fetcher.curFetch).toBeUndefined();
    });

    it("should properly handle multiple fetch requests", async () => {
      const fetcher = new PlasmicModulesFetcher(FETCHER_OPTIONS);
      const fetchLoaderData = vi.fn().mockResolvedValue({
        projects: [],
      });
      fetcher.api = {
        fetchLoaderData,
      };
      const fetch1 = fetcher.fetchAllData();
      const fetch2 = fetcher.fetchAllData();
      await fetch1;
      await fetch2;
      expect(fetchLoaderData).toHaveBeenCalledTimes(1);
      expect(fetcher.curFetch).toBeUndefined();
    });
  });

  describe("preview minRev hints", () => {
    afterEach(() => {
      delete (globalThis as any).__PLASMIC_PREVIEW_MIN_REVS;
    });

    const fetchWith = async (opts: Partial<FetcherOptions>) => {
      const fetcher = new PlasmicModulesFetcher({
        ...FETCHER_OPTIONS,
        ...opts,
      });
      const fetchLoaderData = vi.fn().mockResolvedValue({ projects: [] });
      fetcher.api = { fetchLoaderData };
      await fetcher.fetchAllData();
      return fetchLoaderData.mock.calls[0][1];
    };

    it("should pass the highest known revision of this fetcher's projects", async () => {
      internal_setPreviewMinRev("projA", 5);
      internal_setPreviewMinRev("projA", 7);
      internal_setPreviewMinRev("projA", 6);
      internal_setPreviewMinRev("otherProject", 3);

      const opts = await fetchWith({ preview: true });

      expect(opts.minRevs).toEqual({ projA: 7 });
    });

    it("should not pass minRevs when none are known", async () => {
      const opts = await fetchWith({ preview: true });
      expect(opts.minRevs).toBeUndefined();
    });

    it("should not pass minRevs for published", async () => {
      internal_setPreviewMinRev("projA", 5);
      const opts = await fetchWith({ preview: false });
      expect(opts.minRevs).toBeUndefined();
    });
  });
});
