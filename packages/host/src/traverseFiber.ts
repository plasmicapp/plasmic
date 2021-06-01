import { Fiber, SuspenseComponent } from "./fiber";

// Visits children first
export function traverseUpdates(
  node: Fiber,
  prev: Fiber,
  visit: (node: Fiber) => void
) {
  // Suspense nodes are special cases that need some magic
  // (when they timout, they don't unmount because might lose important state)
  const isSuspense = node.tag === SuspenseComponent;
  const prevDidTimeout = isSuspense && prev.memoizedState !== null;
  const nextDidTimeOut = isSuspense && node.memoizedState !== null;

  if (prevDidTimeout && nextDidTimeOut) {
    // Special case
    const child = node.child;
    const nextFallback = child ? child.sibling : null;
    const prevChild = prev.child;
    const prevFallback = prevChild ? prevChild.sibling : null;
    if (nextFallback != null && prevFallback != null) {
      traverseUpdates(nextFallback, prevFallback, visit);
    }
  } else if (prevDidTimeout && !nextDidTimeOut) {
    // Special case
    const nextPrimaryChildSet = node.child;
    if (nextPrimaryChildSet != null) {
      traverseTree(nextPrimaryChildSet, visit, true);
    }
  } else if (!prevDidTimeout && nextDidTimeOut) {
    // Special case
    const child = node.child;
    const nextFallback = child ? child.sibling : null;
    if (nextFallback != null) {
      traverseTree(nextFallback, visit, true);
    }
  } else {
    // Common case
    if (node.child !== prev.child) {
      let child = node.child;
      while (child) {
        if (child.alternate) {
          traverseUpdates(child, child.alternate, visit);
        } else {
          traverseTree(child, visit, false);
        }
        child = child.sibling;
      }
    }
  }
  visit(node);
}

export function traverseTree(
  node: Fiber,
  visit: (node: Fiber) => void,
  visitSiblings: boolean
): void {
  const isSuspense = node.tag === SuspenseComponent;
  const didTimeout = isSuspense && node.memoizedState !== null;
  if (isSuspense && didTimeout) {
    const primary = node.child;
    const fallback = primary ? primary.sibling : null;
    const fallbackChild = fallback ? fallback.child : null;
    if (fallbackChild !== null) {
      traverseTree(fallbackChild, visit, true);
    }
  } else {
    if (node.child !== null) {
      traverseTree(node.child, visit, true);
    }
  }

  if (visitSiblings && node.sibling !== null) {
    traverseTree(node.sibling, visit, true);
  }
  visit(node);
}
