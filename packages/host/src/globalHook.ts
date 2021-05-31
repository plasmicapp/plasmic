import { Fiber } from "./fiber";
import { assert } from "./lang-utils";
import { traverseTree, traverseUpdates } from "./traverseFiber";

const root = require("window-or-global");

const searchParams = (() => {
  try {
    return new URLSearchParams(
      location.search ||
        new URL(location.toString().replace(/#/, "?")).searchParams.get(
          "searchParams"
        ) ||
        window?.parent?.location.search ||
        ""
    );
  } catch {
    return new URLSearchParams();
  }
})();

// For now we only use our hook when enabling code components as it might
// impact performance
const codeComponents = searchParams.get("codeComponents") === "true";

const officialHook = (root as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

if (codeComponents) {
  assert(!!officialHook);

  if (!officialHook.plasmic) {
    const officialHookProps = { ...officialHook };
    const valNodeData = "data-plasmic-valnode";

    officialHook.plasmic = {
      uidToFiber: new Map<number, Fiber>(),
    };
    const tryGetValNodeUid = (node: Fiber): number | undefined => {
      const hasValNodeData = (v: any) => {
        return typeof v === "object" && v !== null && valNodeData in v;
      };
      if (hasValNodeData(node.memoizedProps)) {
        return +node.memoizedProps[valNodeData];
      }
      return undefined;
    };

    const traversedFibers = new Set<Fiber>();
    const nonCanvasFibers = new Set<Fiber>();
    const canvasRootFiberToUids = new Map<Fiber, number[]>();

    const addNode = (node: Fiber, uids: number[]) => {
      const valNodeUid = tryGetValNodeUid(node);
      if (valNodeUid) {
        officialHook.plasmic.uidToFiber.set(valNodeUid, node);
        uids.push(valNodeUid);
      }
      return false;
    };

    // Return true if this is a canvas frame's tree.
    // Performs a BFS and checks if any of the first 100 nodes contain the
    // "frameInfo" property.
    // Right now we rely on one of the first elements in the tree passing a prop
    // with this name. It's not the first element in the React tree because
    // it's below some React context providers for example.
    // It's important to filter canvas frames to avoid performance regressions.
    const isCanvasFrame = (rootNode: Fiber) => {
      if (canvasRootFiberToUids.has(rootNode)) {
        return true;
      }
      if (nonCanvasFibers.has(rootNode)) {
        return false;
      }
      let count = 0;
      let result = false;
      traversedFibers.add(rootNode);
      traverseTree(rootNode, (node) => {
        if ([...Object.keys(node.memoizedProps || {})].includes("frameInfo")) {
          result = true;
          return true;
        }
        count++;
        return (count >= 100);
      }, false, false);
      if (count >= 100) {
        // Likely not canvas
        nonCanvasFibers.add(rootNode);
      }
      return result;
    };

    const customHookProps = {
      onCommitFiberRoot: (
        rendererID: any,
        fiberRoot: { current: Fiber },
        priorityLevel: any
      ) => {
        const { current: rootNode } = fiberRoot;

        // We only need to traverse canvas frames
        if (isCanvasFrame(rootNode)) {
          const wasMounted =
            rootNode.alternate != null &&
            rootNode.alternate.memoizedState != null &&
            rootNode.alternate.memoizedState.element != null;
          if (!canvasRootFiberToUids.has(rootNode) || !wasMounted) {
            // New tree, traverse it entirely
            const uids: number[] = [];
            canvasRootFiberToUids.set(rootNode, uids);
            traverseTree(rootNode, (fiber: Fiber) => addNode(fiber, uids), true, false);
          } else {
            const isMounted =
              rootNode.memoizedState != null &&
              rootNode.memoizedState.element != null;
            if (isMounted) {
              const uids = canvasRootFiberToUids.get(rootNode) ?? [];
              if (!canvasRootFiberToUids.has(rootNode)) {
                canvasRootFiberToUids.set(rootNode, uids);
              }
              if (rootNode.alternate) {
                traverseUpdates(rootNode, rootNode.alternate, (fiber: Fiber) =>
                  addNode(fiber, uids)
                );
              } else {
                // New tree
                traverseTree(
                  rootNode,
                  (fiber: Fiber) => addNode(fiber, uids),
                  true,
                  false
                );
              }
            }
          }
        }
        officialHookProps.onCommitFiberRoot(
          rendererID,
          fiberRoot,
          priorityLevel
        );
      },
    };

    for (const [key, value] of Object.entries(customHookProps)) {
      // only transfer functions
      if (typeof value == "function") {
        officialHook[key] = value;
      }
    }
  }
}

interface GlobalHookCtx {
  uidToFiber: Map<number, Fiber>;
}

export const globalHookCtx = (officialHook?.plasmic || {
  uidToFiber: new Map<number, Fiber>(),
}) as GlobalHookCtx;
