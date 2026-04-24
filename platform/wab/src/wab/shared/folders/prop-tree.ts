import { moveIndex } from "@/wab/shared/common";
import { getParamDisplayName } from "@/wab/shared/core/components";
import {
  Folder,
  createFolderTreeStructure,
  isFolder,
} from "@/wab/shared/folders/folders-util";
import { Component, Param } from "@/wab/shared/model/classes";

export type PropLeaf = { kind: "param"; param: Param };
export type PropFolderNode = {
  kind: "folder";
  name: string;
  path: string;
  children: PropTreeNode[];
};
export type PropTreeNode = PropLeaf | PropFolderNode;

export function buildPropTree(
  component: Component,
  params: Param[]
): PropTreeNode[] {
  const folderTree = createFolderTreeStructure(params, {
    pathPrefix: "",
    getName: (p) => getParamDisplayName(component, p),
    mapper: (item) => item,
  });
  const convert = (item: Param | Folder<Param>): PropTreeNode =>
    isFolder(item)
      ? {
          kind: "folder",
          name: item.name,
          path: item.path,
          children: item.items.map(convert),
        }
      : { kind: "param", param: item };
  return folderTree.map(convert);
}

export function collectParams(node: PropTreeNode): Param[] {
  return node.kind === "param"
    ? [node.param]
    : node.children.flatMap(collectParams);
}

/**
 * Moves a sibling within its level; folders drag their descendants along.
 * Level params are compacted contiguously at the position of the first one.
 */
export function reorderLevel(
  component: Component,
  siblings: PropTreeNode[],
  fromIdx: number,
  toIdx: number
) {
  const blocks = siblings.map(collectParams);
  moveIndex(blocks, fromIdx, toIdx);
  const newOrder = blocks.flat();

  const levelUids = new Set(newOrder.map((p) => p.uid));
  const insertAt = component.params.findIndex((p) => levelUids.has(p.uid));
  const rest = component.params.filter((p) => !levelUids.has(p.uid));
  rest.splice(insertAt, 0, ...newOrder);
  component.params.splice(0, component.params.length, ...rest);
}
