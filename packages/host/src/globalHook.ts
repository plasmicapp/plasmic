import { Fiber } from "./fiber";
import { ensure } from "./lang-utils";
import { searchParams } from "./preamble";
import { traverse, traverseGenerator } from "./traverseFiber";

const root = globalThis;

// For now we only use our hook when enabling code components as it might
// impact performance
const codeComponents = searchParams.get("codeComponents") === "true";

const officialHook = root.__REACT_DEVTOOLS_GLOBAL_HOOK__;

if (codeComponents) {
  ensure(officialHook);
  // Return true if this is a canvas frame's tree.
  // Performs a BFS and checks if any of the first 30 nodes contain the
  // "frameInfo" property.
  // Right now we rely on one of the first elements in the tree passing a prop
  // with this name. It's not the first element in the React tree because
  // it's below some React context providers for example.
  // It's important to filter canvas frames to avoid performance regressions.
  function isCanvasFrame(rootNode: Fiber) {
    const nodeIterator = traverseGenerator(rootNode, {
      order: ["self", "sibling", "child"],
    });

    let count = 0;
    let next: IteratorResult<Fiber, any>;

    // Get first 30 nodes and then stop the generator
    while (count < 30 && !(next = nodeIterator.next()).done) {
      count++;
      const node: Fiber = next.value;
      if (
        [
          ...Object.keys(node.pendingProps || {}),
          ...Object.keys(node.memoizedProps || {}),
        ].includes("frameInfo")
      ) {
        return true;
      }
    }

    // Finish generator, to prevent memory leak
    nodeIterator.return?.();
    return false;
  }

  if (!officialHook.plasmic) {
    const officialHookProps = { ...officialHook };
    const valNodeData = "data-plasmic-valnode";

    officialHook.plasmic = {
      uidToFiber: new Map<number, Fiber>(),
      startedEvalCount: 0,
      finishedEvalCount: 0,
    };

    // To avoid unnecessary traversals, we keep track of the number of evals
    // that started before the current root commit, and the number of finished
    // evals before the last time a react tree has been traversed. This way,
    // we won't miss any change that happended during eval (so we will traverse
    // on every commit between eval starts and eval finishes) but won't traverse
    // on changes that didn't happen in the eval phase to avoid performance
    // regressions.
    let lastSynced = 0;

    const tryGetValNodeUid = (node: Fiber): number | undefined => {
      const hasValNodeData = (v: any) => {
        return typeof v === "object" && v !== null && valNodeData in v;
      };
      if (hasValNodeData(node.memoizedProps)) {
        return +node.memoizedProps[valNodeData];
      }
      if (hasValNodeData(node.pendingProps)) {
        return +node.pendingProps[valNodeData];
      }
      return undefined;
    };

    const customHookProps = {
      onCommitFiberRoot: (
        rendererID,
        fiberRoot: { current: Fiber },
        priorityLevel
      ) => {
        if (lastSynced < officialHook.plasmic.startedEvalCount) {
          const { current: rootNode } = fiberRoot;

          // We only need to traverse canvas frames
          if (isCanvasFrame(rootNode)) {
            traverse(rootNode, (node: Fiber) => {
              const valNodeUid = tryGetValNodeUid(node);
              if (valNodeUid) {
                officialHook.plasmic.uidToFiber.set(valNodeUid, node);
              }
            });
            lastSynced = officialHook.plasmic.finishedEvalCount;
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
  startedEvalCount: number;
  finishedEvalCount: number;
}

export const globalHookCtx = (officialHook?.plasmic || {
  uidToFiber: new Map<number, Fiber>(),
  startedEvalCount: 0,
  finishedEvalCount: 0,
}) as GlobalHookCtx;
