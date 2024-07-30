import {
  createFolderTreeStructure,
  isFolder,
} from "@/wab/client/components/sidebar/folders/folders-util";

describe("createFolderTreeStructure", () => {
  it("should create a tree structure from given array", () => {
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
        path: "folder1",
        items: [{ name: "folder1/file1" }, { name: "folder1/file2" }],
        count: 2,
      },
      {
        type: "folder",
        name: "folder2",
        path: "folder2",
        items: [
          { name: "/folder2/file3/" },
          {
            type: "folder",
            name: "folder3",
            path: "folder2-folder3",
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

    const result = createFolderTreeStructure(items, (item) => item);
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
