import { Fiber, FiberRoot } from "./fiber";
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
    const valNodeDispose = "data-plasmic-dispose";

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

    const addNode = (node: Fiber) => {
      const valNodeUid = tryGetValNodeUid(node);
      if (valNodeUid) {
        officialHook.plasmic.uidToFiber.set(valNodeUid, node);
      }
    };

    const rmNode = (node: Fiber) => {
      if (valNodeDispose in node.memoizedProps) {
        const dispose: () => void = node.memoizedProps[valNodeDispose];
        dispose();
      }
    };

    // Return true if this is a canvas frame's tree.
    const isCanvasFrame = (containerInfo: any) => {
      const doc: Document | undefined =
        containerInfo?.ownerDocument || containerInfo;
      if (doc && doc.getElementById) {
        return !!doc.getElementById("plasmic-app");
      }
      assert(false, "Unreachable code");
    };

    const knownRoots = new WeakSet<FiberRoot>();

    const customHookProps = {
      onCommitFiberUnmount: (
        rendererID: any,
        node: Fiber,
        ...otherArgs: any[]
      ) => {
        rmNode(node);
        officialHookProps.onCommitFiberUnmount?.(rendererID, node, ...otherArgs);
      },
      onCommitFiberRoot: (
        rendererID: any,
        fiberRoot: FiberRoot,
        ...otherArgs: any[]
      ) => {
        const { current: rootNode, containerInfo } = fiberRoot;

        // We only need to traverse canvas frames
        const isCanvas = isCanvasFrame(containerInfo);
        const isMounted =
          rootNode.memoizedState != null &&
          rootNode.memoizedState.element != null;

        if (isCanvas && isMounted) {
          const wasMounted =
            rootNode.alternate != null &&
            rootNode.alternate.memoizedState != null &&
            rootNode.alternate.memoizedState.element != null;
          if (!knownRoots.has(fiberRoot) || !wasMounted) {
            // New tree, traverse it entirely
            knownRoots.add(fiberRoot);
            traverseTree(rootNode, (fiber: Fiber) => addNode(fiber), false);
          } else {
            if (rootNode.alternate) {
              traverseUpdates(rootNode, rootNode.alternate, (fiber: Fiber) =>
                addNode(fiber)
              );
            } else {
              // New tree
              traverseTree(rootNode, (fiber: Fiber) => addNode(fiber), false);
            }
          }
        }
        officialHookProps.onCommitFiberRoot?.(
          rendererID,
          fiberRoot,
          ...otherArgs
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

// TODO: remove this later, keeping now to avoid compatibility issues with
// stale JS bundle
(globalHookCtx as any).startedEvalCount = 0;
(globalHookCtx as any).finishedEvalCount = 0;
