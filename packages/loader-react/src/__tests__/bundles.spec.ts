import {
  CodeModule,
  ComponentMeta,
  LoaderBundleOutput,
  ProjectMeta,
  Split,
} from "@plasmicapp/loader-fetcher";
import { mergeBundles } from "../bundles";

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

function genComponentMeta(id: string, projectId: string): ComponentMeta {
  return {
    id,
    projectId,
  } as ComponentMeta;
}

function genProjectMeta(id: string): ProjectMeta {
  return {
    id,
  } as ProjectMeta;
}

function genModule(fileName: string, code: string): CodeModule {
  return {
    fileName,
    code,
    imports: [],
    type: "code",
  };
}

function genSplit(id: string, projectId: string): Split {
  return {
    id,
    projectId,
  } as Split;
}

function genBundle(
  bundleKey: string,
  projects: ProjectMeta[],
  components: ComponentMeta[],
  modules: LoaderBundleOutput["modules"],
  filteredIds: Record<string, string[]>,
  activeSplits: Split[]
): LoaderBundleOutput {
  return {
    ...EMPTY_BUNDLE,
    bundleKey,
    projects,
    modules,
    components,
    filteredIds,
    activeSplits,
  };
}

describe("mergeBundles", () => {
  it("should properly merge components and modules", () => {
    expect(
      mergeBundles(
        genBundle(
          "target-bundle",
          [genProjectMeta("p1"), genProjectMeta("p2")],
          [genComponentMeta("p1c1", "p1"), genComponentMeta("p2c1", "p2")],
          {
            browser: [
              genModule("file-p1c1", "code-p1c1-target"),
              genModule("file-p2c1", "code-p2c1-target"),
            ],
            server: [],
          },
          {
            p1: ["p1c3", "p1c4"],
            p2: ["p2c2"],
          },
          []
        ),
        genBundle(
          "from-bundle",
          [genProjectMeta("p1"), genProjectMeta("p3")],
          [
            genComponentMeta("p1c1", "p1"),
            genComponentMeta("p1c2", "p1"), // This component was deleted
            genComponentMeta("p1c3", "p1"), // This one still exists in p1
            genComponentMeta("p3c1", "p3"),
          ],
          {
            browser: [
              genModule("file-p1c1", "code-p1c1-from"),
              genModule("file-p1c2", "code-p1c2-from"),
              genModule("file-p1c3", "code-p1c3-from"),
              genModule("file-p3c1", "code-p3c1-from"),
            ],
            server: [],
          },
          {
            p1: ["p1c4"],
            p3: ["p3c2", "p3c3"],
          },
          []
        )
      )
    ).toMatchObject(
      genBundle(
        "target-bundle",
        [genProjectMeta("p1"), genProjectMeta("p2"), genProjectMeta("p3")],
        [
          genComponentMeta("p1c1", "p1"),
          genComponentMeta("p2c1", "p2"),
          genComponentMeta("p1c3", "p1"),
          genComponentMeta("p3c1", "p3"),
        ],
        {
          browser: [
            genModule("file-p1c1", "code-p1c1-target"),
            genModule("file-p2c1", "code-p2c1-target"),
            // The component p1c2 was deleted, but we don't remove the fileName from the modules
            genModule("file-p1c2", "code-p1c2-from"),
            genModule("file-p1c3", "code-p1c3-from"),
            genModule("file-p3c1", "code-p3c1-from"),
          ],
          server: [],
        },
        {
          p1: ["p1c4"],
          p2: ["p2c2"],
          p3: ["p3c2", "p3c3"],
        },
        []
      )
    );
  });

  it("should properly merge bundles that haven't been filtered", () => {
    const mergedBundle = mergeBundles(
      genBundle(
        "target",
        [genProjectMeta("p1"), genProjectMeta("p2")],
        [genComponentMeta("p1c1", "p1"), genComponentMeta("p2c1", "p2")],
        { browser: [], server: [] },
        {},
        []
      ),
      genBundle(
        "from",
        [genProjectMeta("p1"), genProjectMeta("p3")],
        [
          genComponentMeta("p1c1", "p1"),
          genComponentMeta("p1c2", "p1"), // This component was deleted
          genComponentMeta("p3c1", "p3"),
        ],
        { browser: [], server: [] },
        {},
        []
      )
    );

    expect(mergedBundle).toMatchObject(
      genBundle(
        "target",
        [genProjectMeta("p1"), genProjectMeta("p2"), genProjectMeta("p3")],
        [
          genComponentMeta("p1c1", "p1"),
          genComponentMeta("p2c1", "p2"),
          genComponentMeta("p3c1", "p3"),
        ],
        { browser: [], server: [] },
        {},
        []
      )
    );

    expect(mergedBundle.filteredIds["p1"] ?? []).toMatchObject([]);
    expect(mergedBundle.filteredIds["p2"] ?? []).toMatchObject([]);
    expect(mergedBundle.filteredIds["p3"] ?? []).toMatchObject([]);
  });

  it("should properly merge active splits", () => {
    expect(
      mergeBundles(
        genBundle(
          "target",
          [genProjectMeta("p1"), genProjectMeta("p2")],
          [],
          { browser: [], server: [] },
          {},
          [
            genSplit("p1s1", "p1"),
            genSplit("p1s2", "p1"),
            genSplit("p2s1", "p2"),
          ]
        ),
        genBundle(
          "from",
          [genProjectMeta("p1"), genProjectMeta("p3")],
          [],
          { browser: [], server: [] },
          {},
          [
            genSplit("p1s1", "p1"),
            genSplit("p1s3", "p1"), // This split was deleted and p1s2 was added
            genSplit("p3s1", "p3"),
          ]
        )
      )
    ).toMatchObject(
      genBundle(
        "target",
        [genProjectMeta("p1"), genProjectMeta("p2"), genProjectMeta("p3")],
        [],
        { browser: [], server: [] },
        {},
        [
          genSplit("p1s1", "p1"),
          genSplit("p1s2", "p1"),
          genSplit("p2s1", "p2"),
          genSplit("p3s1", "p3"),
        ]
      )
    );
  });
});
