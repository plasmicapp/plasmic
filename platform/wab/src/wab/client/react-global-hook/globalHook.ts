import { handleError } from "@/wab/client/ErrorNotifications";
import { validateCodeComponentParams } from "@/wab/client/react-global-hook/code-components";
import { Fiber, FiberRoot } from "@/wab/client/react-global-hook/fiber";
import { FAKE_NODE_CHILD_PARAM } from "@/wab/client/react-global-hook/globalHookConstants";
import {
  fiberChildren,
  traverseTree,
  traverseUpdates,
} from "@/wab/client/react-global-hook/traverseFiber";
import {
  GlobalHook,
  GlobalHookCtx,
  SlotArgsData,
  SlotCanvasEnv,
  UpdateableVal,
} from "@/wab/client/react-global-hook/types";
import {
  createValNode,
  mergeArgsData,
  tryGetCloneIndex,
  tryGetFrameUid,
  tryGetOwnerKey,
  tryGetPlasmicClassName,
  tryGetSlotArgInfo,
  tryGetSlotCanvasEnv,
  tryGetSlotPlaceholderKey,
  tryGetValKey,
} from "@/wab/client/react-global-hook/utils";
import { getRenderState } from "@/wab/client/studio-ctx/renderState";
import {
  MAKE_EMPTY_OBJECT,
  arrayEq,
  assert,
  ensure,
  ensureInstance,
  last,
  structuralMerge,
  switchTypeUnsafe,
  withDefault,
  withDefaultFunc,
} from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
  isValSlot,
} from "@/wab/shared/core/val-nodes";
import { SlotInfo } from "@/wab/shared/eval/val-state";
import { isString, omit } from "lodash";
import { observable, runInAction } from "mobx";

const officialHook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ as
  | GlobalHook
  | undefined;

let commitCount = 1;
const fiberToCommitCount = new WeakMap<Fiber, number>();

export function getMostRecentFiberVersion(fiber: Fiber): Fiber {
  if (fiber.alternate) {
    const fiberCommitCount = fiberToCommitCount.get(fiber);
    const alternateCommitCount = fiberToCommitCount.get(fiber.alternate);
    if (
      fiberCommitCount != null &&
      alternateCommitCount != null &&
      alternateCommitCount > fiberCommitCount
    ) {
      return fiber.alternate;
    }
  }
  return fiber;
}

if (officialHook) {
  // TODO: assert `officialHook.plasmic` is null once we fix browser navigation
  // See: https://app.shortcut.com/plasmic/story/27162
  if (officialHook.plasmic) {
    officialHook.plasmic.dispose();
  }

  const officialHookProps = { ...officialHook };

  // This keeps a mapping from a Fiber to the ValNodes that is corresponds to.
  // * For a fiber that corresponds directly to a ValNode (has data-plasmic-valkey),
  //   it maps to the single corresponding ValNode.
  // * For a fiber that doesn't, it maps to ValNodes that its direct fiber children
  //   recursively correspond to
  // This map is used when we traverse on the way up, to propagate ValNodes up the tree
  // to connect them with their parents.
  const fiberToValSubtrees = new WeakMap<
    Fiber,
    { cached: ValNode; nonCached: UpdateableVal }[]
  >();

  // This maps from a Fiber to ValComponent.key to its SlotArgsData. It keeps track of
  // all the SlotArgsData for all the ValComponents at the Fiber tree.
  // * For a fiber that corresponds directly to a slot arg root (has data-plasmic-slot-*),
  //   it maps to its corresponding ValNode.
  // * For a fiber that doesn't, it maps to ValNodes that its direct fiber children
  //   recursively correspond to.
  // This works similarly to fiberToValSubtrees, and is how we propagate ValNodes up the
  // tree to connect with ValComponent.slotArgs.
  const fiberToSlotArgsInSubtree = new WeakMap<
    Fiber,
    Record<string, SlotArgsData>
  >();

  // This maps from a Fiber to ValComponent.key to its SlotCanvasEnv, similar
  // to `fiberToSlotArgsInSubtree` and `fiberToValSubtrees`.
  const fiberToSlotCanvasEnvInSubtree = new WeakMap<
    Fiber,
    Record<string, SlotCanvasEnv>
  >();

  officialHook.plasmic = {
    fiberToVal: new WeakMap(),
    fiberToSlotPlaceholderKeys: new WeakMap(),
    uuidToTplNode: new Map(),
    valKeyToOwnerKey: new Map(),
    frameUidToValRoot: observable.map({}, { deep: false }),
    frameUidToRenderState: new Map(),
    envIdToEnvs: new Map(),
    fullKeyToEnvId: new Map(),
    frameValKeyToContextData: new Map(),
    dispose: () => {
      // clear the custom functions
      for (const [key, value] of Object.entries(officialHookProps)) {
        if (typeof value == "function") {
          officialHook[key] = value;
        }
      }
      officialHook.plasmic = undefined as any;
    },
  };

  const deleteValInFiber = (node: Fiber) => {
    const maybeVal = fiberToNonCachedVal.get(node);
    if (maybeVal) {
      getRenderState(maybeVal.frameUid).unregisterVal(maybeVal);
    }
    officialHook.plasmic.fiberToVal.delete(node);
    fiberToNonCachedVal.delete(node);
  };

  const deleteSlotPlaceholderInFiber = (node: Fiber) => {
    const placeholderData =
      officialHook.plasmic.fiberToSlotPlaceholderKeys.get(node);
    if (placeholderData != null) {
      getRenderState(placeholderData.frameUid).unregisterSlotPlaceholder(
        placeholderData.key,
        placeholderData.fullKey,
        node
      );
    }
    officialHook.plasmic.fiberToSlotPlaceholderKeys.delete(node);
  };

  const cleanupFiberInstance = (node: Fiber) => {
    deleteValInFiber(node);
    deleteSlotPlaceholderInFiber(node);
  };

  const rmNode = (node: Fiber) => {
    cleanupFiberInstance(node);
  };

  const mergeValsInSubtree = (node: Fiber) => {
    const nodeChildren = fiberChildren(node);
    const valsInSubtree = nodeChildren.flatMap(
      (child) => fiberToValSubtrees.get(child) ?? []
    );

    const mergeArgsInSubtree = () => {
      if (nodeChildren.length === 0) {
        return {};
      } else if (nodeChildren.length === 1) {
        return fiberToSlotArgsInSubtree.get(nodeChildren[0]) ?? {};
      } else {
        return (
          structuralMerge(
            nodeChildren.map((n) => fiberToSlotArgsInSubtree.get(n) ?? {})
          ) ?? {}
        );
      }
    };

    const mergeSlotCanvasEnvsInSubtree = () => {
      if (nodeChildren.length === 0) {
        return {};
      } else if (nodeChildren.length === 1) {
        return fiberToSlotCanvasEnvInSubtree.get(nodeChildren[0]) ?? {};
      } else {
        const infos = nodeChildren
          .map((n) => fiberToSlotCanvasEnvInSubtree.get(n))
          .filter(
            (v): v is Record<string, SlotCanvasEnv> =>
              !!v && Object.keys(v).length > 0
          );
        if (infos.length === 0) {
          return {};
        }
        if (infos.length === 1) {
          return infos[0];
        }
        const res: Record<string, SlotCanvasEnv> = {};
        // We also don't use `structuralMerge` for this one because
        // we don't want to merge the canvas envs as it can have side
        // effects, throw `PlasmicUndefinedDataError`, etc.
        for (const info of infos) {
          for (const valCompKey in info) {
            if (!res[valCompKey]) {
              res[valCompKey] = {};
            }
            for (const paramUuid in info[valCompKey]) {
              res[valCompKey][paramUuid] = info[valCompKey][paramUuid];
            }
          }
        }
        return (
          structuralMerge(
            nodeChildren.map((n) => fiberToSlotCanvasEnvInSubtree.get(n) ?? {})
          ) ?? {}
        );
      }
    };
    const argsInSubtree = mergeArgsInSubtree();
    const slotCanvasEnvsInSubtree = mergeSlotCanvasEnvsInSubtree();
    return { valsInSubtree, argsInSubtree, slotCanvasEnvsInSubtree };
  };

  // Return true if this is a canvas frame's tree.
  const isCanvasFrame = (containerInfo: any) => {
    const doc = getDocFromContainerInfo(containerInfo);
    if (!doc) {
      return false;
    }
    return !!doc.getElementById("plasmic-app");
  };

  const getDocFromContainerInfo = (containerInfo: any) => {
    const doc: Document | undefined =
      containerInfo?.ownerDocument || containerInfo;
    if (doc?.getElementById) {
      return doc;
    }
    return null;
  };

  const knownRoots = new WeakSet<FiberRoot>();
  const fiberToNonCachedVal = new WeakMap<Fiber, ValNode>();

  const customHookProps = {
    // Fix to let Fast Refresh of Studio code work.
    //
    // We make the .inject() method temporarily unassign scheduleRefresh, because otherwise,
    // if the Studio frame has react-refresh (Fast Refresh) running, then this will register the inner frames for
    // react-refresh, and even overwrite the renderer for the Studio frame (react-refresh's inject handler checks for
    // injected.scheduleRefresh). This in turn causes react-refresh to break,
    // even for refreshes of purely Studio frame things.
    //
    // We also don't want to completely no-op the inject method to be () => {},
    // because if react-devtools were listening, and we were trying to use it on the
    // artboard frames, then this would prevent that integration from happening.
    //
    // Unsetting scheduleRefresh is the hack that causes react-refresh to pass through
    // the inject call to the react-devtools (which it wraps), but not trigger its own code.
    inject: (injected: any) => {
      const origScheduleRefresh = injected.scheduleRefresh;
      injected.scheduleRefresh = undefined;
      const result = officialHookProps.inject(injected);
      injected.scheduleRefresh = origScheduleRefresh;
      return result;
    },
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
      // We want to create and update the Val tree every time React commits.
      // We will be traversing the updated portions of the tree, and either
      // creating new val nodes or updating existing ones.
      //
      // On the way down, we will be:
      // * Only paying attention to the fibers that corresponds to val nodes
      //   (has a data-plasmic-valkey) or slot placeholders.
      // * Creating the appropriate val nodes, and storing them by
      //   the corresponding Fiber. These val nodes are "disconnected"; they
      //   don't point to each other yet.
      // * Deriving each val node's clone index, and generating its full key
      // * Registering the placeholders.
      //
      // On the way up, we will be:
      // * Propagating the valnodes upward to connect them to their parents.
      //   We do this by mapping each fiber to valnodes that are in its subtree,
      //   stored in fiberToValSubtrees. If a fiber corresponds to a valnode, then
      //   fiberToValSubrees[fiber] just contains its corresponding valnode. If
      //   a fiber does not, then fiberToValSubtrees[fiber] contains the valnodes
      //   that its children fibers correspond to.
      // * For fibers that correspond to valnodes, we update the corresponding
      //   valnodes to reference their children valnodes. This includes updating
      //   ValTag.children, ValComponent.contents, ValComponent.slotArgs, and
      //   ValSlot.contents.
      //
      // Note that for an "updated" tree, we would skip the branches / subtrees that
      // have not been updated. But the traversal always goes from root down, so
      // the "stack" information we keep along the path of the tree will be valid.
      // Because of this, you can expect parent information to be correct, but you
      // cannot expect that sibling branches are also being traversed.
      try {
        const { current: rootNode, containerInfo } = fiberRoot;

        // We only need to traverse canvas frames
        const isCanvas = isCanvasFrame(containerInfo);
        const isMounted =
          rootNode.memoizedState != null &&
          rootNode.memoizedState.element != null;

        if (isCanvas && isMounted) {
          commitCount++;

          // We keep track of all IDs up the tree for a given node because some
          // nodes might forward props to the children (including plasmic-provided
          // props such as the Val key). We use this map to only consider the
          // top most ancestor and be able to get the entire DOM from there.
          // In other words, this keeps a Map of a valKey to the first Fiber
          // we saw with that valKey, down this path in the tree.
          const ancestorKeys = new Map<string, Fiber>();

          // the stack of instances and their cloneIndex we've seen down this path
          // in the tree. This is used for computing the full key.
          const instanceKeyStack: {
            valKey: string;
            cloneIndex: number | undefined;
            isFake?: boolean;
          }[] = [];

          // The stack of Fiber nodes and the ValNode we created for it. Used for
          // linking up ownerComponent when creating ValNodes.
          const valStack: {
            node: Fiber;
            val: ValNode;
            isFake?: boolean;
          }[] = [];

          // This keeps track of how many clones of for a ValNode exists in the tree
          // traversal so far that are rendered for the same slot arg. The map maps
          // ValComponent.key to Param.uuid to ValNode.key to count. This is how
          // we derive the cloneIndex for slot args.
          const valCompToArgToValKeyToCount: Record<
            string,
            Record<string, Record<string, number>>
          > = {};

          /**
           * Increments the count for the valComp/param/val and returns the new count,
           * which can be used as the cloneIndex.
           */
          const updateArgValCount = (
            valCompKey: string,
            paramId: string,
            valKey: string
          ) => {
            const args = withDefaultFunc(
              valCompToArgToValKeyToCount,
              valCompKey,
              MAKE_EMPTY_OBJECT
            );
            const vals = withDefaultFunc(args, paramId, MAKE_EMPTY_OBJECT);
            const count = withDefault(vals, valKey, 0);
            vals[valKey] = count + 1;
            return count;
          };

          const computeFullKey = (valKey: string) => {
            const parts: string[] = [];
            let ancestorKey: string | undefined = undefined;
            for (const part of valKey.split(".")) {
              ancestorKey = ancestorKey ? ancestorKey + "." + part : part;
              const ancestorIndex =
                instanceKeyStack.find((val) => val.valKey === ancestorKey)
                  ?.cloneIndex ?? 0;
              parts.push(`${part}[${ancestorIndex}]`);
            }
            return parts.join(".");
          };

          // Avoid spamming the same error several times
          let reportedNodeError = false;

          let frameUid: number | undefined = undefined;

          const enterNodeSubtree = (node: Fiber) => {
            frameUid = frameUid ?? tryGetFrameUid(node);
            fiberToCommitCount.set(node, commitCount);
            deleteValInFiber(node);
            deleteSlotPlaceholderInFiber(node);
            if (node.alternate) {
              // Clean up data from the old node (used in the previous render)
              cleanupFiberInstance(node.alternate);
            }

            const valKey = tryGetValKey(node);

            // There may be multiple fibers with the same valKey, because some
            // code components would spread all its props -- including data-plasmic-valkey --
            // to its children. So we only keep the "top-most" one, and ignore the
            // other ones.
            const instanceKey: string | number | undefined =
              valKey && !ancestorKeys.has(valKey) ? valKey : undefined;
            const slotPlaceholderKey = tryGetSlotPlaceholderKey(node);

            if (!(instanceKey || slotPlaceholderKey)) {
              // We only care about fibers that correspond to val nodes or placeholders
              return;
            }

            const deriveCloneIndex = () => {
              // There are two main reasons for a node to be "cloned":
              // 1. Via dataRep inside the studio (setting "Repeat element")
              // 2. Via code component repeatedly rendering the same node, either
              //    using React.cloneElement(), or if the node is for a renderFunc,
              //    by calling the renderFunc multiple times.

              // First, we detect if this is the root fiber of a slot arg
              const { slotTplCompKey, slotParamUuid } = tryGetSlotArgInfo(node);

              if (slotTplCompKey != null && slotParamUuid != null) {
                // We are rendering the root fiber for a slot arg, and we need to derive
                // its cloneIndex. We do this by keeping a count of how many fibers for
                // the same valComp/param/valKey we have seen, as they are all clones
                // of each other.
                // For a partial update, we use cached counts for unchanged fibers;
                // see enterUnchangedNode().
                return updateArgValCount(
                  slotTplCompKey,
                  slotParamUuid,
                  valKey ?? "placeholder"
                );
              }

              // Else if it has been stamped with data-plasmic-index -- which is done
              // explicitly by dataRep -- then we use that as the source of truth.
              return tryGetCloneIndex(node);
            };

            const cloneIndex = deriveCloneIndex();

            try {
              const currentFrameUid = ensure(frameUid, "Frame uid not defined");

              if (instanceKey) {
                ancestorKeys.set(instanceKey, node);

                const { slotTplCompKey, slotParamUuid } =
                  tryGetSlotArgInfo(node);
                if (
                  slotTplCompKey &&
                  slotParamUuid &&
                  !instanceKeyStack.some((s) => s.valKey === slotTplCompKey)
                ) {
                  // oops! We've found the root arg to a renderless code component.
                  // Nothing to do here for now!
                }

                function deriveValOwner(ownerKey: string) {
                  const ownerCandidates = valStack.filter(
                    ({ val }) => val.key === ownerKey
                  );
                  if (ownerCandidates.length > 0) {
                    return ensureInstance(
                      last(ownerCandidates).val,
                      ValComponent
                    );
                  }

                  // We're in a situation that we're sure that something unexpected is happening,
                  // since we are traversing the tree in a depth-first manner, and we should have
                  // seen the owner before the current node. This is likely an abnormal behavior
                  // likely due to code component not keeping a stable fiber tree while rendering.

                  // Let's extract uuid, renderingCtx, tpl that represent the owner
                  const ownerUuid = last(ownerKey.split("."));
                  const ownerOwnerKey =
                    officialHook?.plasmic.valKeyToOwnerKey.get(ownerKey);

                  const ownerTplNode = ensure(
                    officialHook?.plasmic.uuidToTplNode.get(ownerUuid)?.deref(),
                    () => `Couldn't find TplNode from uuid ${ownerUuid}`
                  );

                  // We derive the valOwner first, since deriving the valOwner may mutate the valStack
                  // and the instanceKeyStack, which are used to compute the fullKey.
                  const fakeNodeValOwner = ownerOwnerKey
                    ? deriveValOwner(ownerOwnerKey)
                    : undefined;

                  // fakeNodeValOwner not existing is another weird scenario, but this may be possible by
                  // using the component that triggered this current weird scenario as the root of a Plasmic
                  // component.
                  const fakeCloneIndex = fakeNodeValOwner
                    ? updateArgValCount(
                        fakeNodeValOwner.key,
                        // Figuring it out the exact param is not simple, one way would be to include this value
                        // inside the rendering-ctx, but since this is an unexpected scenario, we're just going
                        // to use a stable value
                        FAKE_NODE_CHILD_PARAM,
                        ownerKey
                      )
                    : 0;

                  // We push into the stack before computing the full key, so that this fake node is considered
                  instanceKeyStack.push({
                    valKey: ownerKey,
                    cloneIndex: fakeCloneIndex,
                    isFake: true,
                  });

                  const fakeNodeFullKey = computeFullKey(ownerKey);

                  const renderState = getRenderState(currentFrameUid);

                  // Since we will be creating a fake node, we don't want this node to be registered in the renderState
                  // along with any real nodes. So we will clean up everything for the full key of the fake node.
                  renderState.unregisterFromKey(fakeNodeFullKey);

                  const fakeValOwner = createValNode({
                    globalHookCtx,
                    // We will just use the `node` of the current node, which makes this fake node to use this fiber node
                    // to render selection information, it may be possible that the selection needs to be represented by
                    // multiple nodes, but this should be an even rarer case.
                    node,
                    tplNode: ownerTplNode,
                    instanceKey: ownerKey,
                    fullKey: fakeNodeFullKey,
                    valOwner: fakeNodeValOwner,
                    // We don't have a className so we're just going to use the one present in `node` which matches
                    // the `node` in valNode
                    className: tryGetPlasmicClassName(node),
                    frameUid: currentFrameUid,
                    useFullKeyForEnv: true,
                  });

                  renderState.registerVal(fakeValOwner);

                  valStack.push({
                    node,
                    val: ensureInstance(fakeValOwner, ValComponent),
                    isFake: true,
                  });

                  return ensureInstance(fakeValOwner, ValComponent);
                }

                const ownerKey = tryGetOwnerKey(node);

                // We derive the valOwner first, since deriving the valOwner may mutate the valStack/instanceKeyStack
                const nodeValOwner = ownerKey
                  ? deriveValOwner(ownerKey)
                  : undefined;

                instanceKeyStack.push({ valKey: instanceKey, cloneIndex });

                // Note we need to compute fullKey _after_ we push onto instanceKeyStack
                const fullKey = computeFullKey(instanceKey);

                const tplUuid = last(instanceKey.split("."));
                const tplNode = ensure(
                  officialHook.plasmic.uuidToTplNode.get(tplUuid)?.deref(),
                  () => `Couldn't find TplNode from uuid ${tplUuid}`
                );

                const valNode = createValNode({
                  globalHookCtx,
                  node,
                  tplNode,
                  instanceKey,
                  fullKey,
                  valOwner: nodeValOwner,
                  className: tryGetPlasmicClassName(node),
                  frameUid: currentFrameUid,
                });

                const cachedValNode = ensure(
                  getRenderState(valNode.frameUid).registerVal(valNode),
                  () => `Should have at least one val node to merge`
                );
                fiberToNonCachedVal.set(node, valNode);
                officialHook.plasmic.fiberToVal.set(node, cachedValNode);
                valStack.push({ node, val: cachedValNode });

                validateCodeComponentParams({
                  globalHookCtx,
                  frameUid,
                  instanceKey,
                  valNode,
                  tplNode,
                });
              } else if (slotPlaceholderKey) {
                const [tplCompKey, paramUuid] = slotPlaceholderKey.split("~");
                assert(
                  isString(tplCompKey) && isString(paramUuid),
                  () =>
                    `Couldn't parse slot placeholder key: ${JSON.stringify(
                      slotPlaceholderKey
                    )}`
                );
                const tplCompFullKey = computeFullKey(tplCompKey);
                const slotPlaceholderFullkey = `${tplCompFullKey}~${paramUuid}[${
                  cloneIndex ?? 0
                }]`;
                officialHook.plasmic.fiberToSlotPlaceholderKeys.set(node, {
                  frameUid: currentFrameUid,
                  fullKey: slotPlaceholderFullkey,
                  key: slotPlaceholderKey,
                  toSlotSelection: () => {
                    if (frameUid) {
                      const valComp =
                        getRenderState(frameUid).fullKey2val(tplCompFullKey);
                      if (valComp && valComp instanceof ValComponent) {
                        const param = valComp.tpl.component.params.find(
                          (p) => p.uuid === paramUuid
                        );
                        if (param) {
                          return new SlotSelection({
                            val: valComp,
                            slotParam: param,
                          });
                        }
                      }
                    }
                    return undefined;
                  },
                });
                getRenderState(currentFrameUid).registerSlotPlaceholder(
                  slotPlaceholderKey,
                  slotPlaceholderFullkey,
                  node
                );
              }
            } catch (err) {
              // Fail to process canvas data - clean up this node so the
              // canvas doesn't freeze completely
              cleanupFiberInstance(node);
              if (instanceKey && ancestorKeys.get(instanceKey) === node) {
                ancestorKeys.delete(instanceKey);
              }
              if (!reportedNodeError) {
                handleError(err);
                reportedNodeError = true;
              }
            }
          };

          const leaveNodeSubtree = (node: Fiber) => {
            // Again, multiple fibers can have the same valKey, so we only want the
            // top-most -- the one that we found and stored in ancestorKeys in
            // enterNodeSubtree()
            const valKey = tryGetValKey(node);
            const instanceKey =
              valKey && ancestorKeys.get(valKey) === node ? valKey : undefined;

            // Here we propagate the valnodes "upward". We see what val nodes
            // our fiber children have, and set them as our own val nodes.
            // This is the default behavior for a fiber that does not correspond
            // to a valnode.
            let { valsInSubtree, argsInSubtree, slotCanvasEnvsInSubtree } =
              mergeValsInSubtree(node);

            const maybeSlotEnvData = tryGetSlotCanvasEnv(node);
            if (maybeSlotEnvData) {
              // If this is a wrapper element with the updated canvas env of
              // a slot arg from a component that provides data. Update
              // `fiberToSlotCanvasEnvInSubtree`.
              // We check for that independently of whether `instanceKey`
              // exists, since this is not a prop provided to a `ValNode`.
              // We also don't use anything like `structuralMerge` because
              // we don't want to merge the canvas envs as it can have side
              // effects, throw `PlasmicUndefinedDataError`, etc.
              if (
                !slotCanvasEnvsInSubtree[maybeSlotEnvData.tplComponentValKey]
              ) {
                slotCanvasEnvsInSubtree[maybeSlotEnvData.tplComponentValKey] =
                  {};
              }
              slotCanvasEnvsInSubtree[maybeSlotEnvData.tplComponentValKey][
                maybeSlotEnvData.slotPropUuid
              ] = maybeSlotEnvData.env;
              fiberToSlotCanvasEnvInSubtree.set(node, slotCanvasEnvsInSubtree);
            } else {
              // Otherwise, we just propagate whatever args we've accumulated
              // so far upward
              fiberToSlotCanvasEnvInSubtree.set(node, slotCanvasEnvsInSubtree);
            }

            if (!instanceKey) {
              // For fibers that don't correspond to val nodes, we don't need
              // anything more from them; just keep track of the vals and args
              // at this point of the subtree so its parent can continue
              // propagating them upward
              fiberToValSubtrees.set(node, valsInSubtree);
              fiberToSlotArgsInSubtree.set(node, argsInSubtree);
              fiberToSlotCanvasEnvInSubtree.set(node, slotCanvasEnvsInSubtree);
              return;
            }

            // Pop some information off the traversal stack
            ancestorKeys.delete(instanceKey);
            delete valCompToArgToValKeyToCount[instanceKey];

            assert(
              last(instanceKeyStack).valKey === instanceKey,
              () =>
                `Expected "instanceKey" ${instanceKey} to match the last element of "instanceKeyStack", but got ${JSON.stringify(
                  instanceKeyStack
                )}`
            );

            instanceKeyStack.pop();

            assert(
              valStack.length === 0 || !last(valStack).isFake,
              "The last val node in valStack should be a real one"
            );

            if (valStack.length > 0 && last(valStack).node === node) {
              valStack.pop();

              // We only start popping after the real node that made the fake ones to be pushed gets popped
              while (valStack.length > 0 && last(valStack).isFake) {
                const key = valStack.pop()!.val.key;
                delete valCompToArgToValKeyToCount[key];

                assert(
                  instanceKeyStack.length > 0 && last(instanceKeyStack).isFake,
                  "While popping fake nodes, instanceKeyStack should have a respective fake node"
                );
                instanceKeyStack.pop();
              }
            }

            const cachedVal = ensure(
              officialHook.plasmic.fiberToVal.get(node),
              () =>
                `Fiber with valKey ${valKey} should have a corresopnding ValNode`
            );
            const nonCachedVal = ensure(
              fiberToNonCachedVal.get(node),
              () =>
                `Fiber with valKey ${valKey} should have a corresponding nonCachedVal node`
            );

            /**
             * We want to link the children Val Nodes to the parents here.
             * However, we need to make sure to only update the non-cached
             * versions of the Val Nodes, since the cached version is only a
             * merge of the non-cached versions.
             */
            const renderState = getRenderState(cachedVal.frameUid);
            try {
              valsInSubtree.forEach(({ nonCached }) => {
                nonCached.parent = cachedVal;
                renderState.recomputeCachedVal(nonCached.fullKey);
              });
              switchTypeUnsafe(cachedVal)
                .when(ValComponent, (valComp: ValComponent) => {
                  const nonCachedComp = ensureInstance(
                    nonCachedVal,
                    ValComponent
                  ) as UpdateableVal<ValComponent>;
                  const contents = valsInSubtree.map(({ cached }) => cached);
                  if (
                    contents &&
                    (!nonCachedComp.contents ||
                      !arrayEq(nonCachedComp.contents, contents))
                  ) {
                    nonCachedComp.contents = contents;
                  }

                  // If this ValComponent has slot args, we also want to attach
                  // them. Roots of slot args have been stored in argsDataStack,
                  // so we look them up and attach them here.
                  const argsData = argsInSubtree[valComp.key];
                  if (argsData) {
                    Object.entries(argsData).forEach(([uuid, vs]) => {
                      const p = valComp.tpl.component.params.find(
                        (param) => param.uuid === uuid
                      );
                      if (p) {
                        nonCachedComp.slotArgs.set(
                          p,
                          vs.map(({ cached }) => cached)
                        );
                        vs.map(({ nonCached }) => nonCached).forEach((v) => {
                          v.slotInfo = new SlotInfo(
                            p,
                            // ValSlots only exist in Plasmic components, since they are handled by us during the rendering,
                            // but for code components, the slot is scoped by the code component itself. Directly checking if
                            // the tpl.component is a PlasmicComponent may not be enough, since the user can re-expose the slot
                            // of a code component through a Plasmic component.
                            !isCodeComponent(valComp.tpl.component) &&
                            isValSlot(v.parent)
                              ? ensureInstance(v.parent, ValSlot)
                              : undefined,
                            valComp
                          );
                          renderState.recomputeCachedVal(v.fullKey);
                        });
                      }
                    });
                  }
                  // There's no need to propagate the args for this ValComp
                  // further up the tree
                  argsInSubtree = omit(argsInSubtree, valComp.key);

                  // Similarly we look for slot canvas envs for this ValComp
                  const slotCanvasEnvs = slotCanvasEnvsInSubtree[valComp.key];
                  if (slotCanvasEnvs) {
                    Object.entries(slotCanvasEnvs).forEach(
                      ([uuid, slotEnv]) => {
                        const p = valComp.tpl.component.params.find(
                          (param) => param.uuid === uuid
                        );
                        if (p) {
                          nonCachedComp.slotCanvasEnvs.set(p, slotEnv);
                        }
                      }
                    );
                  }
                  // Do not use omit as it performs a deep clone for plain objects
                  slotCanvasEnvsInSubtree = { ...slotCanvasEnvsInSubtree };
                  delete slotCanvasEnvsInSubtree[valComp.key];
                })
                .when(ValTag, () => {
                  const nonCachedTag = ensureInstance(
                    nonCachedVal,
                    ValTag
                  ) as UpdateableVal<ValTag>;
                  nonCachedTag.children = valsInSubtree.map(
                    ({ cached }) => cached
                  );
                })
                .when(ValSlot, () => {
                  const nonCachedSlot = ensureInstance(
                    nonCachedVal,
                    ValSlot
                  ) as UpdateableVal<ValSlot>;
                  nonCachedSlot.contents = valsInSubtree.map(
                    ({ cached }) => cached
                  );
                })
                .result();
              renderState.recomputeCachedVal(cachedVal.fullKey);

              // Time to propagate these new val nodes upwards! First, the
              // fiberToValSubtrees. This is so its parent fiber will see that this
              // child fiber corresponds ton this ValNode.
              fiberToValSubtrees.set(node, [
                { cached: cachedVal, nonCached: nonCachedVal },
              ]);

              // Next, we propagate the args val nodes.
              const { slotTplCompKey, slotParamUuid } = tryGetSlotArgInfo(node);
              if (slotTplCompKey && slotParamUuid) {
                // If this is a root fiber of a component arg, then we add an entry
                // for this in argsInSubtree. This will be the first time we encounter
                // this in our upward traversal, so this will be the first entry
                // we enter for slotTplCompKey.slotParamUuid.
                const mergedArgsData = mergeArgsData(argsInSubtree, {
                  [slotTplCompKey]: {
                    [slotParamUuid]: [
                      { cached: cachedVal, nonCached: nonCachedVal },
                    ],
                  },
                });
                fiberToSlotArgsInSubtree.set(node, mergedArgsData);
              } else {
                // Otherwise, we just propagate whatever args we've accumulated
                // so far upward
                fiberToSlotArgsInSubtree.set(node, argsInSubtree);
              }

              // Finally, if this node is the root node corresponding to a frame,
              // set it as the frame ValRoot
              const maybeFrameUid = tryGetFrameUid(node);
              if (
                maybeFrameUid &&
                cachedVal !==
                  officialHook.plasmic.frameUidToValRoot.get(maybeFrameUid)
              ) {
                // Root Node
                officialHook.plasmic.frameUidToValRoot.set(
                  maybeFrameUid,
                  ensureInstance(cachedVal, ValComponent)
                );
              }
            } catch (err) {
              // Fail to process canvas data - clean up this node so the
              // canvas doesn't freeze completely
              cleanupFiberInstance(node);
              if (!reportedNodeError) {
                handleError(err);
                reportedNodeError = true;
              }
              fiberToValSubtrees.set(node, []);
              fiberToSlotArgsInSubtree.set(node, {});
            }
          };

          const enterUnchangedNode = (node: Fiber) => {
            // To derive cloneIndex, we need to keep an accurate count of how many
            // clones of valcompkey-param-valkey fibers we have seen. But in a partial
            // traversal, we won't visit every fiber. Thankfully, we do have a cache
            // of all the args we have seen under this unchanged fiber, so we can
            // derive the count from there.
            const argsInSubtree = fiberToSlotArgsInSubtree.get(node);
            if (argsInSubtree) {
              for (const [valCompId, argsData] of Object.entries(
                argsInSubtree
              )) {
                for (const [paramId, vals] of Object.entries(argsData)) {
                  for (const val of vals) {
                    updateArgValCount(valCompId, paramId, val.cached.key);
                  }
                }
              }
            }
          };

          const wasMounted =
            rootNode.alternate != null &&
            rootNode.alternate.memoizedState != null &&
            rootNode.alternate.memoizedState.element != null;

          runInAction(() => {
            if (!knownRoots.has(fiberRoot) || !wasMounted) {
              // New tree, traverse it entirely
              knownRoots.add(fiberRoot);
              traverseTree(rootNode, enterNodeSubtree, leaveNodeSubtree, false);
            } else {
              if (rootNode.alternate) {
                traverseUpdates(
                  rootNode,
                  rootNode.alternate,
                  enterNodeSubtree,
                  leaveNodeSubtree,
                  rmNode,
                  enterUnchangedNode
                );
              } else {
                // New tree
                traverseTree(
                  rootNode,
                  enterNodeSubtree,
                  leaveNodeSubtree,
                  false
                );
              }
            }
          });
          assert(
            ancestorKeys.size === 0,
            () =>
              "`ancestorUids` should be empty at the end of the tree traversal"
          );
          assert(
            instanceKeyStack.length === 0,
            () =>
              "`instanceKeyStack` should be empty at the end of the tree traversal"
          );
          assert(
            valStack.length === 0,
            () => "`valStack` should be empty at the end of the tree traversal"
          );
          // Disable this assertion while we don't handle linking slot args from
          // "logic" components to the component's parent (when the "logic"
          // component isn't rendered). See:
          // https://app.shortcut.com/plasmic/story/28325
          /*
          assert(
            Array.from(
              Object.keys(fiberToSlotArgsInSubtree.get(rootNode) ?? {})
            ).length === 0,
            () =>
              `Couldn't find tplComponents with keys: ${Array.from(
                Object.keys(fiberToSlotArgsInSubtree.get(rootNode) ?? {})
              ).join(", ")}`
          ); */
        }
      } catch (err) {
        handleError(err);
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

export const globalHookCtx: GlobalHookCtx = officialHook?.plasmic ?? {
  uuidToTplNode: new Map(),
  valKeyToOwnerKey: new Map(),
  fiberToVal: new WeakMap(),
  fiberToSlotPlaceholderKeys: new WeakMap(),
  frameUidToValRoot: new Map(),
  frameUidToRenderState: new Map(),
  envIdToEnvs: new Map(),
  fullKeyToEnvId: new Map(),
  frameValKeyToContextData: new Map(),
  dispose: () => {},
};
