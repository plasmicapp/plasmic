/**
 * This set of components and hooks are useful when you need to create many virtual lists
 * in a stack and you want to allocate space between them "fairly".  We cannot just depend
 * on AutoSizer as usual, because AutoSizer depends on the parent to be sized, which means
 * either you have an explicit size in mind already, or everything will need to be 100% or
 * flex-grow: 1.
 *
 * Instead, this tries to allocate space fairly and evenly, without taking up more space
 * than necessary to each section.
 */

import { useDisplayed } from "@/wab/client/dom-utils";
import { ensure } from "@/wab/shared/common";
import { removeFromArray } from "@/wab/commons/collections";
import {
  combineProps,
  useBatchedDelayed,
  useConstant,
} from "@/wab/commons/components/ReactUtil";
import L from "lodash";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import ResizeObserver from "resize-observer-polyfill";

const ListStackContext = React.createContext<ListStackContextValue | undefined>(
  undefined
);

interface ListStackContextValue {
  /**
   * Registers a container element that can be allocated space;
   * should be called on mount
   */
  registerContainer: (id: string, element: HTMLElement) => void;

  /**
   * Unregisters a container that was allocated space; should be
   * called on unmount
   */
  unregisterContainer: (id: string, element: HTMLElement) => void;

  /**
   * Requests space for a container. in useEffect whenever requested
   * space changes.
   */
  requestSpace: (
    id: string,
    opts: { space: number; minSpace?: number }
  ) => void;

  /**
   * Returns space that has been allocated to this ListSpace. Should
   * be called in render()
   */
  getAllocatedSpace: (id: string) => number;
}

interface ListStackState {
  requests: Record<string, number>;
  minRequests: Record<string, number | undefined>;
  containers: HTMLElement[];
  allocations: Record<string, number>;
}

function useListStackContext() {
  return ensure(
    React.useContext(ListStackContext),
    `Must be a descendant of ListStackContext`
  );
}

/**
 * Returns the height of the content of the root element, except
 * for accounting for the height of the `excepts` elements, which
 * should all be descendants of `root`.
 */
function getHeightExcept(root: HTMLElement, excepts: HTMLElement[]) {
  function getPathToRoot(elt: HTMLElement) {
    const path: HTMLElement[] = [];
    while (true) {
      path.push(elt);
      if (elt === root || !elt.parentElement) {
        break;
      }

      elt = elt.parentElement;
    }
    return path;
  }

  const exceptPaths = excepts.map(getPathToRoot);
  const containingElements = L.uniq(L.flatten(exceptPaths));
  let total = 0;

  function visitElement(elt: HTMLElement) {
    const sty = getComputedStyle(elt);
    if (sty.position === "absolute" || sty.display === "none") {
      // Don't count elements that are not part of the flow
      return;
    }
    if (excepts.includes(elt)) {
      // We ignore the except elements
      return;
    }
    if (!containingElements.includes(elt)) {
      // If this is not an element along the path to one of the
      // except elements, then we just look at offsetHeight
      total +=
        elt.offsetHeight +
        parseFloat(sty.marginTop) +
        parseFloat(sty.marginBottom);
      return;
    }

    // Otherwise, this element is an ancestor of one of the
    // containers.  We first calculate how much space is taken
    // up by its border, padding, and margins
    total +=
      parseFloat(sty.marginTop) +
      parseFloat(sty.marginBottom) +
      parseFloat(sty.paddingTop) +
      parseFloat(sty.paddingBottom) +
      parseFloat(sty.borderTopWidth) +
      parseFloat(sty.borderBottomWidth);

    // Now we visit each child of this element recursively
    for (let i = 0; i < elt.childElementCount; i++) {
      visitElement(elt.children[i] as HTMLElement);
    }
  }

  visitElement(root);

  return total;
}

export function ListStack(props: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const stateRef = React.useRef<ListStackState>({
    requests: {},
    minRequests: {},
    containers: [],
    allocations: observable.object<Record<string, number>>({}),
  });
  const sizeObserver = useConstant(
    () =>
      new ResizeObserver((entries) => {
        // Only kick off space reallocation if any of the visible containers
        // have changed size
        if (
          entries.some((entry) => (entry.target as HTMLElement).offsetParent)
        ) {
          delayedReallocateSpace();
        }
      })
  );

  // Always observe the root element for size changes
  React.useEffect(() => {
    const rootElt = rootRef.current;
    if (rootElt) {
      sizeObserver.observe(rootElt);
      return () => sizeObserver.unobserve(rootElt);
    }
    return undefined;
  }, [rootRef.current, sizeObserver]);

  const reallocateSpace = React.useCallback(
    () =>
      runInAction(() => {
        if (!rootRef.current) {
          return;
        }
        const { requests, containers, allocations, minRequests } =
          stateRef.current;

        const rootElt = rootRef.current;
        const chromeHeight = getHeightExcept(rootElt, containers);
        const rootHeight = rootElt.offsetHeight;
        const totalAvailable = rootHeight - chromeHeight;
        const totalRequested = L.sum(L.values(requests));
        let stillAvailable = totalAvailable;

        const setAllocation = (key: string, space: number) => {
          if (allocations[key] !== space) {
            allocations[key] = space;
          }
        };

        if (totalRequested <= totalAvailable) {
          // The happy path!  Everyone gets what they requested
          for (const key of L.keys(requests)) {
            setAllocation(key, requests[key]);
          }
        } else {
          const numRequests = L.values(requests).filter((v) => v > 0).length;
          if (numRequests === 0) {
            return;
          }
          const fairSpace = Math.floor(stillAvailable / numRequests);

          const toAllocate = L.keys(requests);
          // First, give space away to requests that are smaller than fairSpace
          for (const key of L.keys(requests)) {
            const request = requests[key];
            if (request <= fairSpace) {
              setAllocation(key, request);
              stillAvailable -= request;
              removeFromArray(toAllocate, key);
            }
          }

          // Reserve the minRequests
          for (const key of toAllocate) {
            if (minRequests[key] !== undefined) {
              stillAvailable -= minRequests[key] as number;
            }
          }

          const newFairSpace = Math.floor(stillAvailable / toAllocate.length);
          for (const key of toAllocate) {
            const newAllocation = (minRequests[key] ?? 0) + newFairSpace;
            setAllocation(key, newAllocation);
          }
        }
        console.log("Allocated space", {
          root: rootRef.current,
          chromeHeight,
          rootHeight,
          totalAvailable,
          totalRequested,
          allocations: { ...allocations },
          requests: { ...requests },
          containers,
        });
      }),
    [stateRef]
  );

  // Descendant ListSpaces will be registering / unregistering / requesting
  // space as they are updated.  We don't want to have to run the reallocation
  // algorithm each time this happens, as that may trigger more children to
  // re-render unnecessarily.  Instead, we really want to first gather our
  // set of descendant ListSpaces and how much space each is requesting, and
  // then run the reallocation.  Unfortunately there's no such hook to make
  // that happen, so we resort to doing setTimeout() to do so.
  const delayedReallocateSpace = useBatchedDelayed(reallocateSpace);

  const requestSpace = React.useCallback(
    (id: string, opts: { space: number; minSpace?: number }) => {
      stateRef.current.requests[id] = opts.space;
      stateRef.current.minRequests[id] = opts.minSpace;
      delayedReallocateSpace();
      return stateRef.current.allocations[id] ?? 0;
    },
    [stateRef, reallocateSpace, delayedReallocateSpace]
  );
  const getAllocatedSpace = React.useCallback(
    (id: string) => stateRef.current.allocations[id] ?? 0,
    [stateRef]
  );
  const registerContainer = React.useCallback(
    (id: string, container: HTMLElement) => {
      stateRef.current.containers.push(container);
      sizeObserver.observe(container);
      delayedReallocateSpace();
    },
    [stateRef, sizeObserver, delayedReallocateSpace]
  );
  const unregisterContainer = React.useCallback(
    (id: string, container: HTMLElement) => {
      removeFromArray(stateRef.current.containers, container);
      delete stateRef.current.requests[id];
      delete stateRef.current.allocations[id];
      delete stateRef.current.minRequests[id];
      sizeObserver.unobserve(container);
      delayedReallocateSpace();
    },
    [stateRef, sizeObserver, delayedReallocateSpace]
  );

  const value = React.useMemo(
    () => ({
      requestSpace,
      registerContainer,
      unregisterContainer,
      getAllocatedSpace,
    }),
    [requestSpace, registerContainer, unregisterContainer, getAllocatedSpace]
  );

  return (
    <ListStackContext.Provider value={value}>
      <div
        ref={rootRef}
        {...combineProps(props, {
          style: { height: "100%", display: "flex", flexDirection: "column" },
        })}
      />
    </ListStackContext.Provider>
  );
}

let __nextSpaceId = 0;

/**
 * Descendant element that will get space allocated to it by the ancestor
 * ListStack.  Its children is a render prop that takes in the space allocated.
 */
export const ListSpace = observer(function ListSpace(props: {
  children: (opts: { height: number }) => React.ReactNode;
  space: number;
  minSpace?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const id = useConstant(() => `${__nextSpaceId++}`);
  const context = useListStackContext();
  const isDisplayed = useDisplayed(ref);

  const { space: requestedSpace, minSpace: requestedMinSpace } = props;

  // If this container element is displayed, register this container with
  // the ListStack
  React.useEffect(() => {
    const elt = ref.current;
    if (elt && isDisplayed) {
      context.registerContainer(id, elt);
      return () => context.unregisterContainer(id, elt);
    }
    return undefined;
  }, [ref, context, isDisplayed]);

  React.useEffect(() => {
    if (isDisplayed) {
      context.requestSpace(id, {
        space: requestedSpace,
        minSpace: requestedMinSpace,
      });
    }
  }, [id, isDisplayed, requestedSpace, requestedMinSpace]);

  // We keep track of the last space allocated to this container in lastSpaceRef.
  // That way, if this container becomes undisplayed (ancestor has display:none),
  // and then displayed again, we will re-use the space allocated from last time
  // before the ListStack reallocates space again, thus avoiding a flash going
  // from 0 space to some space.
  const lastSpaceRef = React.useRef(0);
  let allocatedSpace = context.getAllocatedSpace(id);
  if (allocatedSpace === 0 && requestedSpace > 0) {
    allocatedSpace = lastSpaceRef.current;
  }

  if (isDisplayed && allocatedSpace > 0) {
    lastSpaceRef.current = allocatedSpace;
  }

  return (
    // The container space has height set to 100%, so that it will grow as more
    // space becomes available.
    <div ref={ref} className="list-space" style={{ height: "100%" }}>
      {props.children({ height: allocatedSpace })}
    </div>
  );
});
