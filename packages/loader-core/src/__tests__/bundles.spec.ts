import {
  CodeModule,
  ComponentMeta,
  LoaderBundleOutput,
} from "@plasmicapp/loader-fetcher";
import { getBundleSubset } from "../bundles";

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
  filteredIds: {},
};

function genComponentMeta(
  id: string,
  projectId: string,
  entry: string
): ComponentMeta {
  return {
    id,
    projectId,
    entry,
  } as ComponentMeta;
}

function genModule(
  fileName: string,
  code: string,
  imports: string[]
): CodeModule {
  return {
    fileName,
    code,
    imports,
    type: "code",
  };
}

function genBundle(
  components: ComponentMeta[],
  modules: LoaderBundleOutput["modules"],
  filteredIds: Record<string, string[]>
): LoaderBundleOutput {
  return {
    ...EMPTY_BUNDLE,
    modules,
    components,
    filteredIds,
  };
}

describe("getBundleSubset", () => {
  it("should return a proper subset", () => {
    const bundle = genBundle(
      [
        genComponentMeta("p1c1", "p1", "file-p1c1"),
        genComponentMeta("p1c2", "p1", "file-p1c2"),
        genComponentMeta("p1c3", "p1", "file-p1c3"),
        genComponentMeta("p1c4", "p1", "file-p1c4"),
        genComponentMeta("p2c1", "p2", "file-p2c1"),
        genComponentMeta("p2c2", "p2", "file-p2c2"),
        genComponentMeta("p2c3", "p2", "file-p2c3"),
        genComponentMeta("p3c1", "p3", "file-p3c1"),
        genComponentMeta("p3c2", "p3", "file-p3c2"),
        genComponentMeta("p3c3", "p3", "file-p3c3"),
      ],
      {
        browser: [
          genModule("file-p1c1", "code-p1c1-target", [
            "file-p1c2",
            "file-p1c3",
          ]),
          genModule("file-p1c2", "code-p1c2-target", []),
          genModule("file-p1c3", "code-p1c3-target", []),
          genModule("file-p1c4", "code-p1c4-target", [
            "file-p1c1",
            "file-p1c2",
          ]),
          genModule("file-p2c1", "code-p2c1-target", []),
          genModule("file-p2c2", "code-p2c2-target", ["file-p2c1"]),
          genModule("file-p2c3", "code-p2c3-target", ["file-p2c2"]),
          genModule("file-p3c1", "code-p3c1-target", []),
          genModule("file-p3c2", "code-p3c2-target", []),
          genModule("file-p3c3", "code-p3c3-target", []),
        ],
        server: [],
      },
      {
        p1: [],
        p2: [],
        p3: [],
      }
    );

    expect(getBundleSubset(bundle, ["file-p3c1", "file-p3c2"])).toMatchObject({
      components: [
        genComponentMeta("p3c1", "p3", "file-p3c1"),
        genComponentMeta("p3c2", "p3", "file-p3c2"),
      ],
      modules: {
        browser: [
          genModule("file-p3c1", "code-p3c1-target", []),
          genModule("file-p3c2", "code-p3c2-target", []),
        ],
      },
      filteredIds: {
        p1: ["p1c1", "p1c2", "p1c3", "p1c4"],
        p2: ["p2c1", "p2c2", "p2c3"],
        p3: ["p3c3"],
      },
    });

    expect(getBundleSubset(bundle, ["file-p1c1"])).toMatchObject({
      components: [
        genComponentMeta("p1c1", "p1", "file-p1c1"),
        genComponentMeta("p1c2", "p1", "file-p1c2"),
        genComponentMeta("p1c3", "p1", "file-p1c3"),
      ],
      modules: {
        browser: [
          genModule("file-p1c1", "code-p1c1-target", [
            "file-p1c2",
            "file-p1c3",
          ]),
          genModule("file-p1c2", "code-p1c2-target", []),
          genModule("file-p1c3", "code-p1c3-target", []),
        ],
      },
      filteredIds: {
        p1: ["p1c4"],
        p2: ["p2c1", "p2c2", "p2c3"],
        p3: ["p3c1", "p3c2", "p3c3"],
      },
    });

    expect(getBundleSubset(bundle, ["file-p1c4"])).toMatchObject({
      components: [
        genComponentMeta("p1c1", "p1", "file-p1c1"),
        genComponentMeta("p1c2", "p1", "file-p1c2"),
        genComponentMeta("p1c3", "p1", "file-p1c3"),
        genComponentMeta("p1c4", "p1", "file-p1c4"),
      ],
      modules: {
        browser: [
          genModule("file-p1c1", "code-p1c1-target", [
            "file-p1c2",
            "file-p1c3",
          ]),
          genModule("file-p1c2", "code-p1c2-target", []),
          genModule("file-p1c3", "code-p1c3-target", []),
          genModule("file-p1c4", "code-p1c4-target", [
            "file-p1c1",
            "file-p1c2",
          ]),
        ],
      },
      filteredIds: {
        p1: [],
        p2: ["p2c1", "p2c2", "p2c3"],
        p3: ["p3c1", "p3c2", "p3c3"],
      },
    });

    expect(getBundleSubset(bundle, ["file-p1c1", "file-p2c3"])).toMatchObject({
      components: [
        genComponentMeta("p1c1", "p1", "file-p1c1"),
        genComponentMeta("p1c2", "p1", "file-p1c2"),
        genComponentMeta("p1c3", "p1", "file-p1c3"),
        genComponentMeta("p2c1", "p2", "file-p2c1"),
        genComponentMeta("p2c2", "p2", "file-p2c2"),
        genComponentMeta("p2c3", "p2", "file-p2c3"),
      ],
      modules: {
        browser: [
          genModule("file-p1c1", "code-p1c1-target", [
            "file-p1c2",
            "file-p1c3",
          ]),
          genModule("file-p1c2", "code-p1c2-target", []),
          genModule("file-p1c3", "code-p1c3-target", []),
          genModule("file-p2c1", "code-p2c1-target", []),
          genModule("file-p2c2", "code-p2c2-target", ["file-p2c1"]),
          genModule("file-p2c3", "code-p2c3-target", ["file-p2c2"]),
        ],
      },
      filteredIds: {
        p1: ["p1c4"],
        p2: [],
        p3: ["p3c1", "p3c2", "p3c3"],
      },
    });
  });
});
