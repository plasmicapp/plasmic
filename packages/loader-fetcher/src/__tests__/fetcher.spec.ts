import { FetcherOptions, PlasmicModulesFetcher } from "../fetcher";

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
  describe("getCachedOrFetch", () => {
    it("should properly clean up curFetch in successful request", async () => {
      const fetcher = new PlasmicModulesFetcher(FETCHER_OPTIONS);
      const fetchLoaderData = jest.fn().mockResolvedValue({
        projects: [],
      });
      fetcher.api = {
        fetchLoaderData,
      };
      await fetcher.fetchAllData();
      expect(fetchLoaderData).toHaveBeenCalledWith(
        ["projA", "projB@1.0.0"],
        expect.anything()
      );
      expect(fetcher.curFetch).toBeUndefined();
    });

    it("should properly clean up curFetch in unsuccessful request", async () => {
      const fetcher = new PlasmicModulesFetcher(FETCHER_OPTIONS);
      const fetchLoaderData = jest.fn().mockRejectedValue(new Error("error"));
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
        expect.anything()
      );
      expect(fetcher.curFetch).toBeUndefined();
    });

    it("should properly handle multiple fetch requests", async () => {
      const fetcher = new PlasmicModulesFetcher(FETCHER_OPTIONS);
      const fetchLoaderData = jest.fn().mockResolvedValue({
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
