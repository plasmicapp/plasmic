import { ProjectMeta, transformApiLoaderBundleOutput } from "../api";

describe("Api", () => {
  describe("transformApiLoaderBundleOutput", () => {
    it("should create filteredIds object", () => {
      const bundle = {
        modules: {
          browser: [],
          server: [],
        },
        components: [],
        globalGroups: [],
        projects: [
          {
            id: "project1",
          } as ProjectMeta,
          {
            id: "project2",
          } as ProjectMeta,
          {
            id: "project3",
          } as ProjectMeta,
        ],
        activeSplits: [],
        bundleKey: "",
        deferChunksByDefault: true,
        disableRootLoadingBoundaryByDefault: true,
      };

      expect(transformApiLoaderBundleOutput(bundle)).toMatchObject({
        ...bundle,
        filteredIds: {
          project1: [],
          project3: [],
        },
      });
    });
  });
});
