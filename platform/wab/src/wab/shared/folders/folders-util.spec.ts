import {
  createFolderTreeStructure,
  getAncestorFolderPaths,
  getFolderDisplayName,
  getFolderTrimmed,
  isFolder,
  parseFolderSegments,
  renameFolderLeaf,
} from "@/wab/shared/folders/folders-util";

describe("createFolderTreeStructure", () => {
  it("should create a tree structure from given array", () => {
    const pathPrefix = "test";
    const items = [
      { name: "////" }, // only slashes
      { name: "folder1/file1" },
      { name: "folder1/file2" },
      { name: "/folder2/file3/" }, // leading and trailing slashes
      { name: " folder2 / folder3/ file4" }, // spaces
      { name: "folder2/folder3/file5" }, // nested
      { name: "file6" },
    ];

    const expectedTree = [
      { name: "////" },
      {
        type: "folder",
        name: "folder1",
        path: "test_folder1",
        items: [{ name: "folder1/file1" }, { name: "folder1/file2" }],
        count: 2,
      },
      {
        type: "folder",
        name: "folder2",
        path: "test_folder2",
        items: [
          { name: "/folder2/file3/" },
          {
            type: "folder",
            name: "folder3",
            path: "test_folder2/folder3",
            items: [
              { name: " folder2 / folder3/ file4" },
              { name: "folder2/folder3/file5" },
            ],
            count: 2,
          },
        ],
        count: 3,
      },
      { name: "file6" },
    ];

    const result = createFolderTreeStructure(items, {
      pathPrefix,
      getName: (item) => item.name,
      mapper: (item) => item,
    });
    expect(result).toEqual(expectedTree);
  });
});

describe("isFolder", () => {
  it("should return true if the item is a folder", () => {
    const folder = {
      type: "folder",
      name: "folder1",
      path: "folder1",
      items: [{ name: "folder1/file1" }],
      count: 1,
    };

    expect(isFolder(folder)).toBe(true);
  });

  it("should return false if the item is not a folder", () => {
    const file = {
      name: "file1",
    };

    expect(isFolder(file)).toBe(false);
  });
});

describe("getFolderDisplayName", () => {
  it("should return the correct display name in a folder", () => {
    const result = getFolderDisplayName("components/buttons/PrimaryButton");
    expect(result).toEqual("PrimaryButton");
  });

  it("should handle items in the root directory correctly", () => {
    const result = getFolderDisplayName("SecondaryButton");
    expect(result).toEqual("SecondaryButton");
  });

  it("should trim leading and trailing slashes", () => {
    const result = getFolderDisplayName("/components/modals/ConfirmModal/");
    expect(result).toEqual("ConfirmModal");
  });

  it("should trim leading and trailing spaces", () => {
    const result = getFolderDisplayName("components/modals/ ConfirmModal ");
    expect(result).toEqual("ConfirmModal");
  });

  it("should handle paths with only slashes", () => {
    const result = getFolderDisplayName("////");
    expect(result).toEqual("////");
  });
});

describe("getFolderTrimmed", () => {
  it("should return the correct trimmed path in a folder", () => {
    const result = getFolderTrimmed("components / buttons/ PrimaryButton ");
    expect(result).toEqual("components/buttons/PrimaryButton");
  });

  it("should handle items in the root directory correctly", () => {
    const result = getFolderTrimmed("SecondaryButton");
    expect(result).toEqual("SecondaryButton");
  });

  it("should trim leading and trailing slashes", () => {
    const result = getFolderTrimmed("/components/modals/ConfirmModal/");
    expect(result).toEqual("components/modals/ConfirmModal");
  });

  it("should handle paths with only slashes", () => {
    const result = getFolderTrimmed("////");
    expect(result).toEqual("");
  });
});

describe("parseFolderSegments", () => {
  it("should split a slash-separated path into segments", () => {
    expect(parseFolderSegments("A/B/C")).toEqual(["A", "B", "C"]);
  });

  it("should trim whitespace around each segment", () => {
    expect(parseFolderSegments(" A / B / C ")).toEqual(["A", "B", "C"]);
  });

  it("should drop leading, trailing, and consecutive slashes", () => {
    expect(parseFolderSegments("/A//B/")).toEqual(["A", "B"]);
  });

  it("should return an empty array for a path of only slashes", () => {
    expect(parseFolderSegments("////")).toEqual([]);
  });

  it("should return an empty array for an empty string", () => {
    expect(parseFolderSegments("")).toEqual([]);
  });

  it("should return a single segment when there is no slash", () => {
    expect(parseFolderSegments("Visible")).toEqual(["Visible"]);
  });

  it("should drop segments that are whitespace-only", () => {
    expect(parseFolderSegments("A /   / B")).toEqual(["A", "B"]);
  });
});

describe("getAncestorFolderPaths", () => {
  it("should return cumulative folder paths above the leaf", () => {
    expect(getAncestorFolderPaths("A / B / C / leaf")).toEqual([
      "A",
      "A/B",
      "A/B/C",
    ]);
  });

  it("should return a single path for one-level nesting", () => {
    expect(getAncestorFolderPaths("Header / title")).toEqual(["Header"]);
  });

  it("should return an empty array when there is no folder prefix", () => {
    expect(getAncestorFolderPaths("leaf")).toEqual([]);
  });

  it("should return an empty array for empty / slash-only input", () => {
    expect(getAncestorFolderPaths("")).toEqual([]);
    expect(getAncestorFolderPaths("////")).toEqual([]);
  });

  it("should ignore whitespace and empty segments", () => {
    expect(getAncestorFolderPaths(" A /  / B / leaf")).toEqual(["A", "A/B"]);
  });
});

describe("renameFolderLeaf", () => {
  it("should replace the last segment in a folder path", () => {
    expect(renameFolderLeaf("Header / Title", "Heading")).toEqual(
      "Header / Heading"
    );
  });

  it("should replace the last segment in a deeply nested path", () => {
    expect(renameFolderLeaf("A / B / C", "D")).toEqual("A / B / D");
  });

  it("should return newLeaf as-is when there is no folder prefix", () => {
    expect(renameFolderLeaf("Visible", "Hidden")).toEqual("Hidden");
  });

  it("should handle leading/trailing whitespace in segments", () => {
    expect(renameFolderLeaf(" Header / Title ", "Heading")).toEqual(
      "Header / Heading"
    );
  });

  it("should treat empty prefix segments as no folder", () => {
    expect(renameFolderLeaf(" / Title", "Heading")).toEqual("Heading");
    expect(renameFolderLeaf(" // / Title", "Heading")).toEqual("Heading");
    expect(renameFolderLeaf(" // / World / Title /", "Heading")).toEqual(
      "World / Heading"
    );
  });

  it("should handle paths with only slashes as no folder", () => {
    expect(renameFolderLeaf("////", "New")).toEqual("New");
  });
});
