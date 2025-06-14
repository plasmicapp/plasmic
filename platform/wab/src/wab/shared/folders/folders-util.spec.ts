import {
  createFolderTreeStructure,
  getFolderDisplayName,
  getFolderTrimmed,
  isFolder,
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
        count: 2
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
