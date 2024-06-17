import { LoaderBundleOutput } from "@plasmicapp/loader-core";
import { InternalPlasmicComponentLoader } from "@plasmicapp/loader-react";
import { NextJsPlasmicComponentLoader } from "../index";
import { SPLIT_0, SPLIT_1 } from "./data";

const EMPTY_BUNDLE: LoaderBundleOutput = {
  modules: {
    browser: [],
    server: [],
  },
  components: [],
  globalGroups: [],
  projects: [],
  activeSplits: [],
  bundleKey: null,
  deferChunksByDefault: false,
  disableRootLoadingBoundaryByDefault: false,
  filteredIds: {},
};

type GetActiveVariationParams = Parameters<
  NextJsPlasmicComponentLoader["getActiveVariation"]
>[0];

function createMockedLoader() {
  const internalLoader = new InternalPlasmicComponentLoader({
    projects: [],
  });

  const mockFetchAllData = jest.fn().mockReturnValue({
    ...EMPTY_BUNDLE,
    activeSplits: [SPLIT_0, SPLIT_1],
  });

  (internalLoader as any).fetcher = {
    fetchAllData: mockFetchAllData,
  };

  const loader = new NextJsPlasmicComponentLoader(internalLoader);

  return loader;
}

describe("SSR getActiveVariation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should use random values for A/B testing", async () => {
    const loader = createMockedLoader();

    const req = {
      headers: {},
      cookies: {},
    } as GetActiveVariationParams["req"];

    const getHeader = jest.fn();
    const setHeader = jest.fn();
    const res = {
      getHeader,
      setHeader,
    } as any;

    const spyMathRandom = jest
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.3) // slice-0
      .mockReturnValueOnce(0.7) // slice-1
      .mockReturnValueOnce(0.85); // slice-2

    expect(
      await loader.getActiveVariation({
        req,
        res,
        traits: {
          age: 30,
        },
      })
    ).toMatchObject({
      "exp.split-0": "slice-0",
      "seg.split-1": "slice-1",
    });

    expect(
      await loader.getActiveVariation({
        req,
        res,
        traits: {
          age: 50,
        },
      })
    ).toMatchObject({
      "exp.split-0": "slice-1",
      "seg.split-1": "slice-2",
    });

    expect(
      await loader.getActiveVariation({
        req,
        res,
        traits: {
          age: 20,
        },
      })
    ).toMatchObject({
      "exp.split-0": "slice-2",
      "seg.split-1": "slice-0",
    });

    expect(getHeader).toHaveBeenNthCalledWith(1, "Set-Cookie");
    expect(getHeader).toHaveBeenNthCalledWith(2, "Set-Cookie");
    expect(getHeader).toHaveBeenNthCalledWith(3, "Set-Cookie");

    expect(setHeader).toHaveBeenNthCalledWith(1, "Set-Cookie", [
      "plasmic:exp.split-0=slice-0",
    ]);
    expect(setHeader).toHaveBeenNthCalledWith(2, "Set-Cookie", [
      "plasmic:exp.split-0=slice-1",
    ]);
    expect(setHeader).toHaveBeenNthCalledWith(3, "Set-Cookie", [
      "plasmic:exp.split-0=slice-2",
    ]);

    expect(spyMathRandom).toHaveBeenCalledTimes(3);
  });

  it("should use known values and cookis for A/B testing", async () => {
    const loader = createMockedLoader();

    const spyMathRandom = jest.spyOn(Math, "random").mockReturnValue(1); // slice-2

    expect(
      await loader.getActiveVariation({
        traits: {},
        known: {
          "exp.split-0": "slice-0",
        },
      })
    ).toMatchObject({
      "exp.split-0": "slice-0",
    });

    expect(
      await loader.getActiveVariation({
        traits: {},
        known: {
          "exp.split-0": "slice-1",
        },
      })
    ).toMatchObject({
      "exp.split-0": "slice-1",
    });

    const req = {
      headers: {},
      cookies: {
        "plasmic:exp.split-0": "slice-0",
      },
    } as any;

    expect(
      await loader.getActiveVariation({
        req: {
          headers: {},
          cookies: {
            "plasmic:exp.split-0": "slice-0",
          },
        } as any,
        traits: {},
      })
    ).toMatchObject({
      "exp.split-0": "slice-0",
    });

    expect(
      await loader.getActiveVariation({
        req: {
          headers: {},
          cookies: {
            "plasmic:exp.split-0": "slice-1",
          },
        } as any,
        traits: {},
      })
    ).toMatchObject({
      "exp.split-0": "slice-1",
    });

    expect(spyMathRandom).not.toHaveBeenCalled();
  });
});
