import {
  OLD_SLOT_IDENTIFIER,
  SLOT_CHILDREN_SHORTHAND,
  SLOT_IDENTIFIER_REGEX,
} from "@/wab/client/figma-importer/constants";
import { SceneNode } from "@/wab/client/figma-importer/plugin-types";
import { assert, ensure } from "@/wab/common";
import { TplNamable } from "@/wab/tpls";

type FigmaSlotInfo = Record<string, TplNamable[]>;

/**
 * OLD_SLOT_IDENTIFIER is used to identify the old pattern of slot naming with `slot: {name}`
 * SLOT_CHILDREN_SHORTHAND is used when the user uses the shorthand `[slot]` to indicate a slot for children
 * SLOT_IDENTIFIER_REGEX is used to identify the new pattern of slot naming with `[slot: {name}]`
 */
export function parseNodeNameToSlotMeta(rawNodeName: string):
  | {
      isSlot: true;
      slotName: string;
      tplName?: string;
    }
  | { isSlot: false } {
  const nodeName = rawNodeName.trim();

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
        slotName,
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
 * which are nodes checked with `parseNodeNameToSlotMeta`.
 *
 * It's allowed to have multiple nodes mapped to the same slot, which will be merged into a single array.
 */
export function getAllSlotsInNode(
  node: SceneNode,
  // Transform any SceneNode to a TplNamable
  fn: (node: SceneNode) => TplNamable | undefined,
  opts: {
    // Whether `node` is a valid candidate or not for a slot, it's important when the root node was matched
    // to a component, that it doesn't consider itself as a slot
    includeRoot: boolean;
  }
): FigmaSlotInfo {
  if (opts.includeRoot) {
    const slotMeta = parseNodeNameToSlotMeta(node.name);
    if (slotMeta.isSlot) {
      const tplNode = fn(node);
      assert(tplNode, `Node ${node.name} wasn't transformed to a TplNode`);

      tplNode.name = slotMeta.tplName;
      return {
        [slotMeta.slotName]: [tplNode],
      };
    }
  }

  switch (node.type) {
    case "INSTANCE":
    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "GROUP": {
      const children = node.children ?? [];
      const slotInfo = children.reduce(
        (prev, child) =>
          mergeSlotInfo(
            prev,
            getAllSlotsInNode(child, fn, {
              includeRoot: true,
            })
          ),
        {} as FigmaSlotInfo
      );
      return slotInfo;
    }
    default:
      return {};
  }
}

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
