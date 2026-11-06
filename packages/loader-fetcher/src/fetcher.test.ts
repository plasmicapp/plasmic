import { describe, expect, it, vi } from "vitest";
import {
  FetcherOptions,
  internal_getCachedBundleInNodeServer,
  PlasmicModulesFetcher,
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
  ])(
    "keeps Node server bundles separate by %s",
    async (_label, optionA, optionB) => {
      const optsA = { ...FETCHER_OPTIONS, ...optionA } as FetcherOptions;
      const optsB = { ...FETCHER_OPTIONS, ...optionB } as FetcherOptions;
      const fetcherA = new PlasmicModulesFetcher(optsA);
      const fetcherB = new PlasmicModulesFetcher(optsB);
      const bundleA = { projects: [], marker: "A" };
      const bundleB = { projects: [], marker: "B" };
      (fetcherA as any).api.fetchLoaderData = vi
        .fn()
        .mockResolvedValue(bundleA);
      (fetcherB as any).api.fetchLoaderData = vi
        .fn()
        .mockResolvedValue(bundleB);
      await fetcherA.fetchAllData();
      await fetcherB.fetchAllData();
      expect(internal_getCachedBundleInNodeServer(optsA)).toBe(bundleA);
      expect(internal_getCachedBundleInNodeServer(optsB)).toBe(bundleB);
      expect(internal_getCachedBundleInNodeServer({ ...optsA })).toBe(bundleA);
    },
  );

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
});
