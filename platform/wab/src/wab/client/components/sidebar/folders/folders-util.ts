import { isNonNil } from "@/wab/shared/common";

export interface Folder<T> {
  type: "folder";
  name: string;
  path: string;
  items: (T | Folder<T>)[];
  count: number;
}

/**
 * Create a tree structure from given array by splitting the `name` in "/"
 * @param items the array to be grouped
 * @returns
 */
export function createFolderTreeStructure<T extends { name: string }, K>(
  items: T[],
  mapper: (item: T | Folder<T>) => K
): K[] {
  const tree: (T | Folder<T>)[] = [];

  items.forEach((item) => {
    const folders = item.name
      .split("/")
      .map((str) => str.trim())
      .filter((str) => !!str);
    insertIntoTree(item, tree, folders, 0, "");
  });

  return tree.map((item) => mapper(item));
}

export function isFolder<T>(item: T | Folder<T>): item is Folder<T> {
  return (
    typeof item === "object" &&
    isNonNil(item) &&
    "type" in item &&
    item.type === "folder"
  );
}

function insertIntoTree<T extends { name: string }>(
  item: T,
  children: (T | Folder<T>)[],
  folders: string[],
  index: number,
  path: string
) {
  // >= because we want to handle the case where folders is an empty array
  if (index >= folders.length - 1) {
    children.push(item);
    return;
  }

  const newPath = `${path}${index !== 0 ? "-" : ""}${folders[index]}`;
  let treeNode: Folder<T> | undefined = children.find(
    (currentNode): currentNode is Folder<T> =>
      isFolder(currentNode) && currentNode.name === folders[index]
  );
  if (!treeNode) {
    const len = children.push({
      type: "folder",
      name: folders[index],
      path: newPath,
      items: [],
      count: 0,
    });
    treeNode = children[len - 1] as Folder<T>;
  }

  insertIntoTree(item, treeNode.items, folders, index + 1, newPath);
  treeNode.count++;
}
