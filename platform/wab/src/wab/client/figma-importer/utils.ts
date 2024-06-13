import { Component, TplNode } from "@/wab/classes";
import {
  OLD_SLOT_IDENTIFIER,
  SLOT_CHILDREN_SHORTHAND,
  SLOT_IDENTIFIER_REGEX,
} from "@/wab/client/figma-importer/constants";
import {
  ComponentNode,
  DefaultFrameMixin,
  FrameNode,
  GroupNode,
  InstanceNode,
  RGB,
  RGBA,
  SceneNode,
  Transform,
} from "@/wab/client/figma-importer/plugin-types";
import { FigmaData } from "@/wab/client/figma-importer/types";
import { unzip } from "@/wab/collections";
import { arrayEqIgnoreOrder, assert, ensure } from "@/wab/common";
import { arrayReversed } from "@/wab/commons/collections";
import { getComponentDisplayName } from "@/wab/components";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { MkTplTagOpts, TplNamable, isTplVariantable } from "@/wab/tpls";
import { getBoundingRect } from "@figma-plugin/helpers";
import { isString } from "lodash";
import { Matrix } from "transformation-matrix";

export function transformToMatrix(transform: Transform): Matrix {
  const [[a, c, e], [b, d, f]] = transform;
  return { a, b, c, d, e, f };
}

export function rgbToString({ r, g, b }: RGB, a: number = 1): string {
  return `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(
    b * 255
  )}, ${a})`;
}

export function rgbaToString({ r, g, b, a }: RGBA) {
  return rgbToString({ r, g, b }, a);
}

export function truncateNumber(n: number, sigFigs = 2) {
  return Math.floor(n * Math.pow(10, sigFigs)) / Math.pow(10, sigFigs);
}

export function isDefaultFrameMixin(node: any): node is DefaultFrameMixin {
  return (
    node.type === "COMPONENT" ||
    node.type === "FRAME" ||
    node.type === "INSTANCE"
  );
}

function getMainComponentName(node: InstanceNode) {
  if (!node.mainComponent) {
    return undefined;
  }
  if (isString(node.mainComponent)) {
    return node.mainComponent;
  }
  return node.mainComponent.name;
}

export function findMappedComponent(
  node: InstanceNode,
  components: Component[]
) {
  // First use Component.figmaMappings, which takes precedence over
  // name matching
  const mainComponentName = getMainComponentName(node);
  const mapped = components.find((c) =>
    c.figmaMappings?.some((m) => m.figmaComponentName === mainComponentName)
  );
  if (mapped) {
    return mapped;
  }

  // Next do matching with component.name
  const mapped2 = components.find((c) => c.name === mainComponentName);
  if (mapped2) {
    return mapped2;
  }

  // Finally, use display name, which is "fuzziest"
  return components.find(
    (c) => getComponentDisplayName(c) === mainComponentName
  );
}

export const isFigmaData = (object: any): object is FigmaData => {
  if (typeof object === "object") {
    return arrayEqIgnoreOrder(
      Object.keys(object).filter((k) => k !== "version"),
      ["i", "k", "n", "s", "v"]
    );
  }
  return false;
};

/**
 * Our raw FigmaData has no absoluteTransform, only relativeTransform, but this
 * is sufficient for computing a bounding box.
 */
function _getBoundingRect(nodes: SceneNode[]) {
  return getBoundingRect(
    nodes.map((node) => ({
      ...node,
      absoluteTransform: node.relativeTransform,
    }))
  );
}

/**
 * Wrap the given nodes in a fixed-size free container box, sized to be the
 * bounding box of the nodes.
 */
export function wrapInBox(
  vtm: VariantTplMgr,
  nodeTplPairs: [SceneNode, TplNode][],
  boxOpts: MkTplTagOpts = {}
) {
  const rsh = (tpl: TplNode) => RSH(vtm.ensureBaseVariantSetting(tpl).rs, tpl);

  const [nodes, tpls] = unzip(nodeTplPairs);
  const bbox = _getBoundingRect(nodes);

  for (const [node, tpl] of nodeTplPairs) {
    if (!isTplVariantable(tpl)) {
      continue;
    }

    rsh(tpl).merge({
      position: "absolute",
      left: `${Math.round(node.x - bbox.x)}px`,
      top: `${Math.round(node.y - bbox.y)}px`,
    });
  }

  const wrapper = vtm.mkTplTagX("div", boxOpts, arrayReversed(tpls));
  rsh(wrapper).merge({
    display: "block",
    position: "relative",
    width: `${Math.round(bbox.width)}px`,
    height: `${Math.round(bbox.height)}px`,
  });

  return wrapper;
}

/**
 * If there are multiple Figma nodes, we wrap it in a free container, and fix
 * each child's offset to be relative to the wrapper
 */
export function wrapTplNodes(
  nodeToTpl: Map<SceneNode, TplNode>,
  vtm: VariantTplMgr
) {
  return nodeToTpl.size === 0
    ? undefined
    : nodeToTpl.size === 1
    ? Array.from(nodeToTpl.values())[0]
    : wrapInBox(vtm, [...nodeToTpl.entries()], { name: "Figma Paste" });
}

export function hasChildren(
  node: SceneNode
): node is FrameNode | GroupNode | ComponentNode | InstanceNode {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  );
}

export function getLayoutParent(node: SceneNode) {
  const parent = ensure(
    node.parent,
    "All nodes from denormalized figma data should have parent"
  );
  return { layoutParent: parent, indexOfSibling: -1 };
}

type FigmaSlotInfo = Record<string, TplNamable[]>;

function mergeSlotInfo(a: FigmaSlotInfo, b: FigmaSlotInfo): FigmaSlotInfo {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const result: FigmaSlotInfo = {};
  for (const key of keys) {
    const aVal = a[key] ?? [];
    const bVal = b[key] ?? [];
    result[key] = [...aVal, ...bVal];
  }
  return result;
}

/**
 * OLD_SLOT_IDENTIFIER is used to identify the old pattern of slot naming with `slot: {name}`
 * SLOT_CHILDREN_SHORTHAND is used when the user uses the shorthand `[slot]` to indicate a slot for children
 * SLOT_IDENTIFIER_REGEX is used to identify the new pattern of slot naming with `[slot: {name}]`
 */
export function parseNodeNameToSlotMeta(nodeName: string):
  | {
      isSlot: true;
      slotName: string;
      tplName?: string;
    }
  | { isSlot: false } {
  const parseTplName = (tplName: string) => {
    if (tplName.trim().length > 0) {
      return tplName.trim();
    }
    return undefined;
  };

  if (nodeName.startsWith(OLD_SLOT_IDENTIFIER)) {
    const slotName = nodeName.substring(OLD_SLOT_IDENTIFIER.length).trim();
    if (slotName.length > 0) {
      return {
        isSlot: true,
        slotName: nodeName.substring(OLD_SLOT_IDENTIFIER.length),
        tplName: undefined,
      };
    } else {
      return {
        isSlot: false,
      };
    }
  } else if (nodeName.endsWith(SLOT_CHILDREN_SHORTHAND)) {
    return {
      isSlot: true,
      slotName: "children",
      tplName: parseTplName(
        nodeName.substring(0, nodeName.length - SLOT_CHILDREN_SHORTHAND.length)
      ),
    };
  } else if (SLOT_IDENTIFIER_REGEX.test(nodeName)) {
    const match = ensure(
      nodeName.match(SLOT_IDENTIFIER_REGEX),
      `Invalid slot name: ${nodeName}`
    );
    return {
      isSlot: true,
      slotName: match[1],
      tplName: parseTplName(nodeName.substring(0, match.index)),
    };
  } else {
    return {
      isSlot: false,
    };
  }
}

/**
 * Given a node in figma we will search the children of the node for slots,
 * which are nodes checked with `paseNodeNameToSlot`.
 *
 * It's allowed to have multiple nodes mapped to the same slot, which will be merged into a single array.
 */
export function getAllSlotsInNode(
  node: SceneNode,

  // Transform any SceneNode to a TplNamable
  fn: (node: SceneNode) => TplNamable | undefined
): FigmaSlotInfo {
  const slotMeta = parseNodeNameToSlotMeta(node.name);
  if (slotMeta.isSlot) {
    const tplNode = fn(node);
    assert(tplNode, `Node ${node.name} wasn't transformed to a TplNode`);

    tplNode.name = slotMeta.tplName;
    return {
      [slotMeta.slotName]: [tplNode],
    };
  }

  switch (node.type) {
    case "INSTANCE":
    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "GROUP": {
      const children = node.children ?? [];
      const slotInfo = children.reduce(
        (prev, child) => mergeSlotInfo(prev, getAllSlotsInNode(child, fn)),
        {} as FigmaSlotInfo
      );
      return slotInfo;
    }
    default:
      return {};
  }
}
