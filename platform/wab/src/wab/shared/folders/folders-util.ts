import { isNonNil, last } from "@/wab/shared/common";

export interface Folder<T> {
  type: "folder";
  name: string;
  // Prefixed folder path
  path: string;
  items: (T | Folder<T>)[];
  count: number;
}

/**
 * Create a tree structure from a given array by splitting the `name` in "/".
 * @param items - The array of items to create the folder tree structure from.
 * @param pathPrefix - The prefix to use for the path of the folders. Must not include underscore.
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

  // Ensure prefix is always separated by underscore
  const prefix = pathPrefix && `${pathPrefix}_`

  const tree: (T | Folder<T>)[] = [];

  items.forEach((item) => {
    const folders = getName(item)
      .split("/")
      .map((str) => str.trim())
      .filter((str) => !!str);
    insertIntoTree(item, tree, folders, 0, prefix);
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

  const newPath = `${path}${index !== 0 ? "/" : ""}${folders[index]}`;
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

  insertIntoTree(
    item,
    treeNode.items,
    folders,
    index + 1,
    newPath
  );
  treeNode.count++;
}

/**
 * Get the un-prefixed folder path with a slash appended. The prefix is
 * the text up to the first underscore, e.g. Page_Group1/Group2 
 * @param name - Folder path with prefix
 * @returns Plain folder path with slash
 */
export function getFolderWithSlash(name?: string): string {
  if (!name) {
    return '';
  }
  const prefixEnd = name.indexOf('_');
  const path = prefixEnd >= 0 ? name.slice(prefixEnd + 1) : name;
  return `${path}/`;
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
