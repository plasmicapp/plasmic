import { isNonNil, last } from "@/wab/shared/common";

export interface Folder<T> {
  type: "folder";
  name: string;
  path: string;
  items: (T | Folder<T>)[];
  count: number;
}

/**
 * Create a tree structure from a given array by splitting the `name` in "/".
 * @param items - The array of items to create the folder tree structure from.
 * @param pathPrefix - The prefix to use for the path of the folders.
 * @param getName - A function that returns the `name` of an item.
 * @param mapper - A function that maps an item or folder to the desired output type.
 * @returns The array of items with the folder tree structure applied.
 */
export function createFolderTreeStructure<T, K>(
  items: T[],
  opts: {
    pathPrefix: string;
    getName: (item: T) => string;
    mapper: (item: T | Folder<T>) => K;
  }
): K[] {
  const { pathPrefix, getName, mapper } = opts;

  const tree: (T | Folder<T>)[] = [];

  items.forEach((item) => {
    const folders = getName(item)
      .split("/")
      .map((str) => str.trim())
      .filter((str) => !!str);
    insertIntoTree(item, tree, folders, 0, pathPrefix);
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

function insertIntoTree<T>(
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

export function getFolderTrimmed(name: string) {
  return name
    .split("/")
    .map((str) => str.trim())
    .filter((str) => !!str)
    .join("/");
}

export function getFolderDisplayName(name: string) {
  const path = name
    .split("/")
    .map((str) => str.trim())
    .filter((str) => !!str);
  return path.length > 0 ? last(path) : name;
}
