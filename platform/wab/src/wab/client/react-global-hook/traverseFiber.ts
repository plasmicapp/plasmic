import { Fiber, SuspenseComponent } from "@/wab/client/react-global-hook/fiber";

export function fiberChildren(fiber: Fiber) {
  const children: Fiber[] = [];
  let child = fiber.child;
  while (child) {
    children.push(child);
    child = child.sibling;
  }
  return children;
}

// Visits children first
export function traverseUpdates(
  node: Fiber,
  prev: Fiber,
  enter: (node: Fiber) => void,
  leave: (node: Fiber) => void,
  onFakeUnmount: (node: Fiber) => void,
  unchanged: (node: Fiber) => void
) {
  // Suspense nodes are special cases that need some magic
  // (when they timout, they don't unmount because might lose important state)
  const isSuspense = node.tag === SuspenseComponent;
  const prevDidTimeout = isSuspense && prev.memoizedState !== null;
  const nextDidTimeOut = isSuspense && node.memoizedState !== null;
  enter(node);

  if (prevDidTimeout && nextDidTimeOut) {
    // Special case
    const child = node.child;
    const nextFallback = child ? child.sibling : null;
    const prevChild = prev.child;
    const prevFallback = prevChild ? prevChild.sibling : null;
    if (prevFallback == null && nextFallback != null) {
      traverseTree(nextFallback, enter, leave, true);
    }
    if (nextFallback != null && prevFallback != null) {
      traverseUpdates(
        nextFallback,
        prevFallback,
        enter,
        leave,
        onFakeUnmount,
        unchanged
      );
    }
  } else if (prevDidTimeout && !nextDidTimeOut) {
    // Special case
    const nextPrimaryChildSet = node.child;
    if (nextPrimaryChildSet != null) {
      traverseTree(nextPrimaryChildSet, enter, leave, true);
    }
  } else if (!prevDidTimeout && nextDidTimeOut) {
    // Special case
    const child = node.child;
    const nextFallback = child ? child.sibling : null;
    recursivelyUnmount(prev, onFakeUnmount);
    if (nextFallback != null) {
      traverseTree(nextFallback, enter, leave, true);
    }
  } else {
    // Common case
    if (node.child !== prev.child) {
      let child = node.child;
      while (child) {
        if (child.alternate) {
          traverseUpdates(
            child,
            child.alternate,
            enter,
            leave,
            onFakeUnmount,
            unchanged
          );
        } else {
          traverseTree(child, enter, leave, false);
        }
        child = child.sibling;
      }
    } else if (node.child) {
      unchanged(node.child);
    }
  }
  leave(node);
}

export function traverseTree(
  root: Fiber,
  enter: (node: Fiber) => void,
  leave: (node: Fiber) => void,
  visitSiblings: boolean
): void {
  let node: Fiber | null = root;

  while (node != null) {
    const isSuspense = node.tag === SuspenseComponent;
    const didTimeout = isSuspense && node.memoizedState !== null;
    enter(node);

    if (isSuspense && didTimeout) {
      const primary = node.child;
      const fallback = primary ? primary.sibling : null;
      const fallbackChild = fallback ? fallback.child : null;
      if (fallbackChild !== null) {
        traverseTree(fallbackChild, enter, leave, true);
      }
    } else {
      if (node.child !== null) {
        traverseTree(node.child, enter, leave, true);
      }
    }

    leave(node);
    node = visitSiblings ? node.sibling : null;
  }
}

function recursivelyUnmount(fiber: Fiber, onUnmount: (node: Fiber) => void) {
  const didTimeout =
    fiber.tag === SuspenseComponent && fiber.memoizedState !== null;

  let child = fiber.child;
  if (didTimeout) {
    child = fiber.child?.sibling?.child ?? null;
  }

  while (child != null) {
    if (child.return != null) {
      recursivelyUnmount(child, onUnmount);
      onUnmount(child);
    }
    child = child.sibling;
  }
}
