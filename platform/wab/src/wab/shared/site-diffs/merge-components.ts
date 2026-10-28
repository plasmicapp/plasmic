import { ensureActivatedScreenVariantsForArena } from "@/wab/shared/Arenas";
import {
  fillVirtualSlotContents,
  getSlotArgs,
  getTplSlots,
  isSlot,
} from "@/wab/shared/SlotUtils";
import {
  TplMgr,
  getTplComponentArg,
  setTplComponentArg,
} from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  ensureBaseVariantSetting,
  mkBaseVariant,
  mkVariantSetting,
  toVariantKey,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  attachRenderableTplSlots,
  mkCodeComponent,
} from "@/wab/shared/code-components/code-components";
import { arrayInsertAt } from "@/wab/shared/collections";
import {
  arrayEq,
  arrayEqIgnoreOrder,
  assert,
  ensure,
  maybe,
  removeWhere,
  switchType,
  tuple,
  withoutFalsy,
  withoutNils,
  xGroupBy,
  xIntersect,
  xSetDefault,
} from "@/wab/shared/common";
import {
  CodeComponent,
  allComponentVariants,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { getEquivalentParam } from "@/wab/shared/core/project-deps";
import { visitComponentRefs } from "@/wab/shared/core/sites";
import {
  fixParentPointers,
  isTplComponent,
  mkTplComponentX,
  tplChildren,
  trackComponentRoot,
  trackComponentSite,
  walkTpls,
} from "@/wab/shared/core/tpls";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  Arg,
  Component,
  ObjInst,
  Param,
  RenderExpr,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantSetting,
  ensureKnownRenderExpr,
  ensureKnownTplComponent,
  ensureKnownTplSlot,
  ensureKnownTplTag,
  isKnownRenderExpr,
  isKnownTplComponent,
  isKnownTplTag,
  isKnownVariantsRef,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { Field } from "@/wab/shared/model/model-meta";
import { assertSameInstType } from "@/wab/shared/model/model-tree-util";
import { reorderPageArenaCols } from "@/wab/shared/page-arenas";
import {
  AutoReconciliation,
  DirectConflict,
  SpecialDirectConflict,
  cloneContentsToMergedSite,
  cloneFieldValueToMergedSite,
  cloneObjInstToMergedSite,
  deriveKeyFunc,
  getArrayKey,
  getDirectConflicts,
} from "@/wab/shared/site-diffs/merge-core";
import {
  FieldConflictDescriptorMeta,
  MergeSpecialFieldHandler,
  ModelConflictsMeta,
  modelConflictsMeta,
} from "@/wab/shared/site-diffs/model-conflicts-meta";
import {
  findLastIndex,
  groupBy,
  isEqual,
  isNil,
  keyBy,
  range,
  sortBy,
  uniq,
  uniqBy,
} from "lodash";

function getCompPath(comp: Component, bundler: Bundler) {
  return [
    "components",
    getArrayKey(bundler, comp, {
      cls: meta.clsByName["Site"],
      field: Site.$field_components,
    }),
  ];
}

function getGlobalContextPath(globalContext: TplComponent, bundler: Bundler) {
  return [
    "globalContexts",
    getArrayKey(bundler, globalContext, {
      cls: meta.clsByName["Site"],
      field: Site.$field_globalContexts,
    }),
  ];
}

function getNewAndDeletedComponents(
  ancestorComponents: ReadonlyArray<Component>,
  components: ReadonlyArray<Component>,
) {
  return {
    added: components.filter(
      (c) => !ancestorComponents.find((anc) => anc.uuid === c.uuid),
    ),
    deleted: ancestorComponents.filter(
      (anc) => !components.find((c) => c.uuid === anc.uuid),
    ),
  };
}

// Components with the same uuid can be different versions of one imported
// component, and a release can recreate a param with a new uuid. A swapped
// component matches only by param uuid.
function getMatchingParam(
  component: Component,
  paramComponent: Component,
  param: Param,
) {
  return component.uuid === paramComponent.uuid
    ? getEquivalentParam(component, param)
    : component.params.find((p) => p.uuid === param.uuid);
}

// The nearest instance above `tpl` and its slot arg that holds `tpl`.
function getHoldingSlotArg(tpl: TplNode) {
  let child = tpl;
  while (child.parent && !isKnownTplComponent(child.parent)) {
    child = child.parent;
  }
  const inst = child.parent;
  const arg =
    inst && isKnownTplComponent(inst)
      ? $$$(inst).tryGetArgContainingTpl(child)
      : undefined;
  return inst && arg ? { inst: ensureKnownTplComponent(inst), arg } : undefined;
}

// Whether `tplAnc` was default slot content that the kept branch edited,
// while the other branch still shows default content there. A dependency
// upgrade rebuilds default content with new elements, so the other branch
// can lack `tplAnc` without having deleted it.
function isDefaultContentEditedOnOneBranch(
  tplAnc: TplNode,
  keptTpl: TplNode,
  otherTplsByUuid: Map<string, TplNode>,
) {
  const ancHolder = getHoldingSlotArg(tplAnc);
  const keptHolder = getHoldingSlotArg(keptTpl);
  if (
    !ancHolder ||
    !keptHolder ||
    !isKnownVirtualRenderExpr(ancHolder.arg.expr) ||
    isKnownVirtualRenderExpr(keptHolder.arg.expr)
  ) {
    return false;
  }
  const otherInst = otherTplsByUuid.get(ancHolder.inst.uuid);
  if (!otherInst || !isKnownTplComponent(otherInst)) {
    return false;
  }
  const otherParam = getMatchingParam(
    otherInst.component,
    ancHolder.inst.component,
    ancHolder.arg.param,
  );
  const otherArg = getSlotArgs(otherInst).find(
    (arg) => arg.param === otherParam,
  );
  return !!otherArg && isKnownVirtualRenderExpr(otherArg.expr);
}

// Updates `mergedTpl.parent` to be `branchTpl.parent`
// (and fix the children pointers)
function updateParent(
  mergedTpl: TplNode,
  tplInBranch: TplNode,
  cloneInst: (tpl: TplNode) => TplNode,
) {
  const oldParent = mergedTpl.parent;
  const newParent = tplInBranch.parent && cloneInst(tplInBranch.parent);
  mergedTpl.parent = newParent;
  if (oldParent) {
    // Remove the pointer in the old parent
    switchType(oldParent)
      .when(TplTag, (tpl) => {
        tpl.children = tpl.children.filter((child) => child !== mergedTpl);
      })
      .when(TplSlot, (tpl) => {
        tpl.defaultContents = tpl.defaultContents.filter(
          (child) => child !== mergedTpl,
        );
      })
      .when(TplComponent, (tpl) =>
        (tryGetBaseVariantSetting(tpl)?.args ?? []).forEach((arg) => {
          if (isKnownRenderExpr(arg.expr)) {
            arg.expr.tpl = arg.expr.tpl.filter((child) => child !== mergedTpl);
          }
        }),
      )
      .result();
  }
  if (newParent && !tplChildren(newParent).includes(mergedTpl)) {
    // Update the children for the new parent
    const parentInBranch = ensure(
      tplInBranch.parent,
      `Updated parent must come from branchTpl`,
    );
    let childrenArrayToUpdate: ReadonlyArray<TplNode> = [];
    let setChildrenToUpdate: (children: TplNode[]) => void = () => {};
    let childrenArrayInBranch: ReadonlyArray<TplNode> = [];
    switchType(newParent)
      .when(TplTag, (tpl) => {
        childrenArrayToUpdate = tpl.children;
        setChildrenToUpdate = (children) => {
          tpl.children = children;
        };
        childrenArrayInBranch = ensureKnownTplTag(parentInBranch).children;
      })
      .when(TplSlot, (tpl) => {
        childrenArrayToUpdate = tpl.defaultContents;
        setChildrenToUpdate = (children) => {
          tpl.defaultContents = children;
        };
        childrenArrayInBranch =
          ensureKnownTplSlot(parentInBranch).defaultContents;
      })
      .when(TplComponent, (tpl) => {
        const argInBranch = ensure(
          tryGetBaseVariantSetting(
            ensureKnownTplComponent(parentInBranch),
          )?.args.find(
            (arg) =>
              isKnownRenderExpr(arg.expr) &&
              !!arg.expr.tpl.find((child) => child.uuid === mergedTpl.uuid),
          ),
          `Couldn't find arg in parent tpl component`,
        );
        const renderExprInBranch = ensureKnownRenderExpr(argInBranch.expr);
        const param = getMatchingParam(
          tpl.component,
          ensureKnownTplComponent(parentInBranch).component,
          argInBranch.param,
        );
        if (!param) {
          // The corresponding param has been deleted! Simply delete this node
          mergedTpl.parent = undefined;
          return;
        }
        const renderExpr = setMergedSlotArg(tpl, param, (expr) => expr);
        childrenArrayToUpdate = renderExpr.tpl;
        setChildrenToUpdate = (children) => {
          renderExpr.tpl = children;
        };
        childrenArrayInBranch = renderExprInBranch.tpl;
      })
      .result();

    if (mergedTpl.parent === undefined) {
      return;
    }

    // Insert the element after all nodes that were before it in the branch
    const indexInBranch = ensure(
      childrenArrayInBranch.indexOf(tplInBranch),
      `Couldn't find node in its parent children`,
    );
    setChildrenToUpdate(
      arrayInsertAt(
        childrenArrayToUpdate,
        mergedTpl,
        Math.max(
          ...withoutNils([
            -1,
            ...childrenArrayInBranch
              .slice(0, indexInBranch)
              .map((tpl) =>
                childrenArrayToUpdate.findIndex(
                  (tpl2) => tpl2.uuid === tpl.uuid,
                ),
              ),
          ]),
        ) + 1,
      ),
    );
  }
}

function deriveKeyFuncFromClassNameAndField<
  Cls extends keyof ModelConflictsMeta,
  F extends keyof ModelConflictsMeta[Cls] & string,
>(className: Cls, fieldName: F, bundler: Bundler) {
  return deriveKeyFunc(
    modelConflictsMeta[className][fieldName] as FieldConflictDescriptorMeta,
    bundler,
    {
      cls: meta.clsByName[className],
      field: meta.getFieldByName(className, fieldName),
    },
  );
}

function calcRootToNodesPaths(
  node: TplNode,
  bundler: Bundler,
  processNode: (node: TplNode, path: string[]) => void = () => null,
  currPath = ["tplTree"] as string[],
  nodeToPath = new Map<TplNode, string[]>(),
) {
  nodeToPath.set(node, currPath);
  processNode(node, currPath);

  switchType(node)
    .when(TplTag, (_node) =>
      _node.children.forEach((child) => {
        calcRootToNodesPaths(
          child,
          bundler,
          processNode,
          [
            ...currPath,
            "children",
            deriveKeyFuncFromClassNameAndField(
              "TplTag",
              "children",
              bundler,
            )(child),
          ],
          nodeToPath,
        );
      }),
    )
    .when(TplSlot, (_node) =>
      _node.defaultContents.forEach((child) => {
        calcRootToNodesPaths(
          child,
          bundler,
          processNode,
          [
            ...currPath,
            "defaultContents",
            deriveKeyFuncFromClassNameAndField(
              "TplSlot",
              "defaultContents",
              bundler,
            )(child),
          ],
          nodeToPath,
        );
      }),
    )
    .when(TplComponent, (_node) =>
      getSlotArgs(_node).forEach((arg) =>
        (isKnownRenderExpr(arg.expr) ? arg.expr.tpl : []).forEach(
          (child, _i) => {
            // Getting the key of the arg that contains the tpl
            const argKey = deriveKeyFuncFromClassNameAndField(
              "VariantSetting",
              "args",
              bundler,
            )(arg);

            // Getting the key of the tpl in the arg
            const tplKey = deriveKeyFuncFromClassNameAndField(
              "RenderExpr",
              "tpl",
              bundler,
            )(child);

            calcRootToNodesPaths(
              child,
              bundler,
              processNode,
              [
                ...currPath,
                "vsettings",
                "0", // Base VS is always at index 0
                "args",
                argKey,
                "expr",
                "tpl",
                tplKey,
              ],
              nodeToPath,
            );
          },
        ),
      ),
    )
    .result();

  return nodeToPath;
}

export const tryMergeComponents: MergeSpecialFieldHandler<Site> = (
  siteAncestorCtx,
  siteACtx,
  siteBCtx,
  mergedSiteCtx,
  bundler,
  picks,
  recorder,
): DirectConflict[] => {
  const [siteAncestor, siteA, siteB, mergedSite] = [
    siteAncestorCtx,
    siteACtx,
    siteBCtx,
    mergedSiteCtx,
  ].map((ctx) =>
    ensure(ctx.node, "tryMergeComponents expects all nodes to exist"),
  );

  const cloneInst = <T extends ObjInst>(node: T, branch: Site) =>
    cloneObjInstToMergedSite(node, branch, mergedSite, bundler);

  const deltaA = getNewAndDeletedComponents(
    siteAncestor.components,
    siteA.components,
  );
  const deltaB = getNewAndDeletedComponents(
    siteAncestor.components,
    siteB.components,
  );

  const deletedUuids = new Set([
    ...deltaA.deleted.map((component) => component.uuid),
    ...deltaB.deleted.map((component) => component.uuid),
  ]);
  const deletedComps: Component[] = [];
  mergedSite.components = mergedSite.components.filter((c) => {
    const shouldDelete = deletedUuids.has(c.uuid);
    if (shouldDelete) {
      deletedComps.push(c);
    }
    return !shouldDelete;
  });

  const newComponents = [
    ...deltaA.added.map((c) => cloneInst(c, siteA)),
    ...deltaB.added.map((c) => cloneInst(c, siteB)),
  ];

  mergedSite.components = [...mergedSite.components, ...newComponents];

  // Make sure to track new components
  mergedSite.components.forEach((component) => {
    trackComponentRoot(component);
    trackComponentSite(component, mergedSite);
  });

  // Code components might have been unintentionally unregistered at some point
  // and re-registered again afterwards. But, because it gets a new uuid
  // whenever it's registered again, we would wrongly see it as a different
  // component. We fix it by re-adding it here, and then we rely on
  // `fixDuplicatedCodeComponents` do remove duplicate entries.
  // Right now we make sure to add the old versions of the component to the end
  // of the list, because `fixDuplicatedCodeComponents` arbitrarly takes the
  // first version as the source of truth.
  const codeComponentNames = new Set(
    mergedSite.components.filter(isCodeComponent).map((c) => c.name),
  );
  mergedSite.components = [
    ...mergedSite.components,
    ...deletedComps.filter(
      (deletedComp) =>
        isCodeComponent(deletedComp) &&
        codeComponentNames.has(deletedComp.name),
    ),
  ];

  const updatedComponentsUuids = inferUpdatedComponents(
    siteAncestor,
    siteA,
    siteB,
  );

  // Checking direct conflicts between updated tpls
  const directConflicts: DirectConflict[] = [];
  siteAncestor.components.forEach((ancestorComp) => {
    if (!updatedComponentsUuids.has(ancestorComp.uuid)) {
      return;
    }

    const equivalentOnA = siteA.components.find(
      (comp) => ancestorComp.uuid === comp.uuid,
    );
    const equivalentOnB = siteB.components.find(
      (comp) => ancestorComp.uuid === comp.uuid,
    );

    if (equivalentOnA && equivalentOnB) {
      const mergedComp = ensure(
        mergedSite.components.find((comp) => ancestorComp.uuid === comp.uuid),
        `Merged site is missing component ${ancestorComp.uuid}`,
      );
      const compA = equivalentOnA;
      const compB = equivalentOnB;
      directConflicts.push(
        ...getDirectConflicts({
          ancestorCtx: {
            node: ancestorComp,
            site: siteAncestorCtx.site,
            path: getCompPath(ancestorComp, bundler),
          },
          leftCtx: {
            node: compA,
            site: siteACtx.site,
            path: getCompPath(compA, bundler),
          },
          rightCtx: {
            node: compB,
            site: siteBCtx.site,
            path: getCompPath(compB, bundler),
          },
          mergedCtx: {
            node: mergedComp,
            site: mergedSiteCtx.site,
            path: getCompPath(mergedComp, bundler),
          },
          bundler,
          picks,
          recorder,
        }),
      );
      if (
        ancestorComp.tplTree.uuid !== compA.tplTree.uuid &&
        ancestorComp.tplTree.uuid !== compB.tplTree.uuid &&
        compA.tplTree.uuid !== compB.tplTree.uuid
      ) {
        // Conflict when re-rooting the component
        const pathStr = JSON.stringify(mergedSiteCtx.path);
        const conf: SpecialDirectConflict = {
          conflictType: "special",
          objectType: "components",
          conflictParts: ["tplTree"],
          objectInsts: [compA, compB],
          pathStr: pathStr,
          pickSide: (side) => {
            if (side === "left") {
              mergedComp.tplTree = cloneObjInstToMergedSite(
                compA.tplTree,
                siteA,
                mergedSite,
                bundler,
              );
            } else {
              mergedComp.tplTree = cloneObjInstToMergedSite(
                compB.tplTree,
                siteB,
                mergedSite,
                bundler,
              );
            }
            fixParentPointers(mergedComp.tplTree);
          },
        };
        if (picks) {
          const side = ensure(
            picks[pathStr],
            `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
              Object.keys(picks),
            )}`,
          );
          conf.pickSide(side);
        } else {
          directConflicts.push(conf);
        }
      } else if (mergedComp.tplTree.uuid !== compA.tplTree.uuid) {
        mergedComp.tplTree = cloneInst(compA.tplTree, siteA);
      } else if (mergedComp.tplTree.uuid !== compB.tplTree.uuid) {
        mergedComp.tplTree = cloneInst(compB.tplTree, siteB);
      }
      const tplInAncestorByUuid = new Map(
        flattenComponent(ancestorComp).map((tpl) => [tpl.uuid, tpl]),
      );
      const tplInAByUuid = new Map(
        flattenComponent(compA).map((tpl) => [tpl.uuid, tpl]),
      );
      const tplInBByUuid = new Map(
        flattenComponent(compB).map((tpl) => [tpl.uuid, tpl]),
      );

      // Check for cycles of disconnected nodes after updating the parents
      const checkAndFixCycle = () => {
        while (true) {
          const reachableTplUuids = new Set(
            flattenComponent(mergedComp).map((tpl) => tpl.uuid),
          );
          const tplInDisconnectedCycle = (tplAnc: TplNode) => {
            if (
              reachableTplUuids.has(tplAnc.uuid) ||
              !tplInAByUuid.has(tplAnc.uuid) ||
              !tplInBByUuid.has(tplAnc.uuid)
            ) {
              return false;
            }
            let tpl: TplNode | null | undefined = cloneInst(
              tplAnc,
              siteAncestor,
            );
            const seenUuids = new Set<string>();
            while (tpl) {
              if (seenUuids.has(tpl.uuid)) {
                return true;
              }
              seenUuids.add(tpl.uuid);
              tpl = tpl.parent;
            }
            return false;
          };
          let maybeDisconnectedTplInAnc = flattenComponent(ancestorComp).find(
            tplInDisconnectedCycle,
          );
          // `cloneInst` will just get the matching object in the merged site as
          // it already existed
          let maybeDisconnectedTpl =
            maybeDisconnectedTplInAnc &&
            cloneInst(maybeDisconnectedTplInAnc, siteAncestor);

          // We need to find the first node in the cycle that has moved
          while (
            maybeDisconnectedTpl &&
            maybeDisconnectedTplInAnc &&
            maybeDisconnectedTpl.parent?.uuid ===
              maybeDisconnectedTplInAnc.parent?.uuid
          ) {
            maybeDisconnectedTpl = maybeDisconnectedTpl.parent ?? undefined;
            maybeDisconnectedTplInAnc =
              maybeDisconnectedTplInAnc.parent ?? undefined;
          }

          if (
            maybeDisconnectedTpl &&
            maybeDisconnectedTplInAnc &&
            tplInDisconnectedCycle(maybeDisconnectedTplInAnc)
          ) {
            // Undo the change so the node is no longer disconnected
            updateParent(
              maybeDisconnectedTpl,
              maybeDisconnectedTplInAnc,
              (tpl) => cloneInst(tpl, siteAncestor),
            );
            // Repeat the cycle check to see if there are more nodes to fix
            continue;
          }

          break;
        }
      };

      // In the context of the merge, we need to handle ancestors in a special way
      // instead of only looking at the parent, we need to handle the case where
      // the parent is a component and the tpl has moved between the slots that
      // component has.
      const isSameParent = (tplA: TplNode, tplB: TplNode) => {
        // If the parent is different, the ancestor definitely changed
        if (tplA.parent?.uuid !== tplB.parent?.uuid) {
          return false;
        }
        // If we are dealing with elements without parent and they match in the previous
        // condition, we can assume equality
        if (!tplA.parent || !tplB.parent) {
          return true;
        }
        // If neither of the parents are components, we can assume equality
        if (
          !isKnownTplComponent(tplA.parent) ||
          !isKnownTplComponent(tplB.parent)
        ) {
          return true;
        }
        // If we are dealing with the same parent component, we will check the param
        // that contains each of them to determine equality
        const argContainingA = $$$(tplA.parent).getArgContainingTpl(tplA);
        const argContainingB = $$$(tplB.parent).getArgContainingTpl(tplB);
        return (
          getMatchingParam(
            tplA.parent.component,
            tplB.parent.component,
            argContainingB.param,
          ) === argContainingA.param
        );
      };

      for (const tplMerged of flattenComponent(mergedComp)) {
        const tplA = tplInAByUuid.get(tplMerged.uuid);
        const tplB = tplInBByUuid.get(tplMerged.uuid);
        const tplAnc = tplInAncestorByUuid.get(tplMerged.uuid);
        if (tplA && tplB && tplAnc) {
          if (
            !!tplAnc.parent &&
            !isSameParent(tplAnc, tplA) &&
            !isSameParent(tplAnc, tplB) &&
            !isSameParent(tplA, tplB)
          ) {
            // Both branches moved the same element to different locations
            const pathStr = JSON.stringify(mergedSiteCtx.path);
            const conf: SpecialDirectConflict = {
              conflictType: "special",
              objectType: "components",
              conflictParts: ["tplTree"],
              objectInsts: [compA, compB],
              pathStr: pathStr,
              pickSide: (side) => {
                if (side === "left") {
                  updateParent(tplMerged, tplA, (tpl) =>
                    cloneObjInstToMergedSite(tpl, siteA, mergedSite, bundler),
                  );
                } else {
                  updateParent(tplMerged, tplB, (tpl) =>
                    cloneObjInstToMergedSite(tpl, siteB, mergedSite, bundler),
                  );
                }
                checkAndFixCycle();
              },
            };

            if (picks) {
              const side = ensure(
                picks[pathStr],
                `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
                  Object.keys(picks),
                )}`,
              );
              conf.pickSide(side);
            } else {
              directConflicts.push(conf);
            }
          } else if (!!tplAnc.parent && !isSameParent(tplA, tplAnc)) {
            updateParent(tplMerged, tplA, (tpl) => cloneInst(tpl, siteA));
          } else if (!!tplAnc.parent && !isSameParent(tplB, tplAnc)) {
            updateParent(tplMerged, tplB, (tpl) => cloneInst(tpl, siteB));
          }
        }
      }

      checkAndFixCycle();

      const nodeToPathAnc = calcRootToNodesPaths(ancestorComp.tplTree, bundler);
      const nodeToPathA = calcRootToNodesPaths(compA.tplTree, bundler);
      const nodeToPathB = calcRootToNodesPaths(compB.tplTree, bundler);

      // At the current moment of execution, we have changed instances of tplNodes present
      // in mergedComp.tplTree to detach themselves from their parent and updated their parent
      // to point to the correct parent. But we haven't attached new nodes to their parent in
      // the mergedComp.tplTree. This will be done by `mergeTplNodeChildren` which is called through
      // `getDirectConflicts`. Since it's possible that old components have moved to be children
      // of new components we need to traverse the children of the new components and execute
      // `getDirectConflicts`. We do it during the calculation of the rootToNodesPaths so that
      // we update the tree and descend into the correct children
      calcRootToNodesPaths(
        mergedComp.tplTree,
        bundler,
        (tplMerged, nodePathMerged) => {
          const tplA = tplInAByUuid.get(tplMerged.uuid);
          const tplB = tplInBByUuid.get(tplMerged.uuid);
          const tplAnc = tplInAncestorByUuid.get(tplMerged.uuid);
          if (tplA && tplB && tplAnc) {
            const nodePathAnc = ensure(
              nodeToPathAnc.get(tplAnc),
              "Path to tplNode must exist.",
            );
            const nodePathA = ensure(
              nodeToPathA.get(tplA),
              "Path to tplNode must exist.",
            );
            const nodePathB = ensure(
              nodeToPathB.get(tplB),
              "Path to tplNode must exist.",
            );
            directConflicts.push(
              ...getDirectConflicts({
                ancestorCtx: {
                  node: tplAnc,
                  site: siteAncestorCtx.site,
                  path: [...getCompPath(ancestorComp, bundler), ...nodePathAnc],
                },
                leftCtx: {
                  node: tplA,
                  site: siteACtx.site,
                  path: [...getCompPath(compA, bundler), ...nodePathA],
                },
                rightCtx: {
                  node: tplB,
                  site: siteBCtx.site,
                  path: [...getCompPath(compB, bundler), ...nodePathB],
                },
                mergedCtx: {
                  node: tplMerged,
                  site: mergedSiteCtx.site,
                  path: [
                    ...getCompPath(mergedComp, bundler),
                    ...nodePathMerged,
                  ],
                },
                bundler,
                picks,
                recorder,
              }),
            );
            // Args merged from an upgraded dep point at another version's params,
            // so getSlotArgs() (identity) would skip these slots. Rebind before
            // descending; merge-deps completes the upgrade afterwards.
            if (isKnownTplComponent(tplMerged)) {
              const paramsByUuid = new Map(
                tplMerged.component.params.map((param) => [param.uuid, param]),
              );
              const branchTpls = [tplA, tplB].filter(isKnownTplComponent);
              for (const vs of tplMerged.vsettings) {
                // Record each arg's branch now, since the rebind below replaces
                // the param that tells the branches apart.
                const argBranches = new Map<Arg, TplComponent>();
                for (const arg of vs.args) {
                  const branchTpl = branchTpls.find((tpl) =>
                    tpl.component.params.includes(arg.param),
                  );
                  if (branchTpl) {
                    argBranches.set(arg, branchTpl);
                  }
                  const param = branchTpl
                    ? getMatchingParam(
                        tplMerged.component,
                        branchTpl.component,
                        arg.param,
                      )
                    : paramsByUuid.get(arg.param.uuid);
                  if (param && param !== arg.param) {
                    arg.param = param;
                  }
                }
                const askWhichValue = (
                  name: string,
                  pickSide: SpecialDirectConflict["pickSide"],
                ) => {
                  // Each variant setting can ask about the same prop, so the
                  // key includes its variants for each pick to stay separate.
                  const pathStr = JSON.stringify([
                    ...getCompPath(mergedComp, bundler),
                    ...nodePathMerged,
                    "vsettings",
                    JSON.stringify(
                      vs.variants.map((v) => toVariantKey(v)).sort(),
                    ),
                    "args",
                    name,
                  ]);
                  const conf: SpecialDirectConflict = {
                    conflictType: "special",
                    objectType: "components",
                    conflictParts: [`tpl ${tplMerged.uuid} arg ${name}`],
                    objectInsts: [compA, compB],
                    pathStr,
                    pickSide,
                  };
                  if (picks) {
                    const side = ensure(
                      picks[pathStr],
                      `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
                        Object.keys(picks),
                      )}`,
                    );
                    conf.pickSide(side);
                  } else {
                    directConflicts.push(conf);
                  }
                };
                // A recreated prop has a new param uuid, so the merge keeps
                // both branches' args for it. Swapped instances are skipped,
                // since fixSwappedTplComponents removes the other component's
                // args.
                const propArgs = vs.args.filter(
                  (arg) =>
                    !isSlot(arg.param) &&
                    (tplMerged.component.params.includes(arg.param) ||
                      argBranches.get(arg)?.component.uuid ===
                        tplMerged.component.uuid),
                );
                for (const [name, args] of xGroupBy(
                  propArgs,
                  (arg) => arg.param.variable.name,
                )) {
                  if (args.length < 2) {
                    continue;
                  }
                  const keepOnly = (keep: Arg) => {
                    vs.args = vs.args.filter(
                      (arg) => !args.includes(arg) || arg === keep,
                    );
                  };
                  if (
                    args.every((arg) =>
                      instUtil.deepEquals(arg.expr, args[0].expr, true),
                    )
                  ) {
                    keepOnly(args[0]);
                    continue;
                  }
                  const argFrom = (tpl: TplNode) =>
                    args.find((arg) => argBranches.get(arg) === tpl);
                  askWhichValue(name, (side) =>
                    keepOnly(
                      ensure(
                        argFrom(side === "left" ? tplA : tplB),
                        `Each branch set ${name}`,
                      ),
                    ),
                  );
                }
                // An upgrade that recreated a prop points its arg at the new
                // param, so the merge doesn't compare the two branches' edits
                // and keeps the upgrading branch's value. The upgrade keeps the
                // arg's iid, so the iid finds the same arg on each side.
                if (
                  !isKnownTplComponent(tplAnc) ||
                  !isKnownTplComponent(tplA) ||
                  !isKnownTplComponent(tplB) ||
                  tplA.component.uuid !== tplMerged.component.uuid ||
                  tplB.component.uuid !== tplMerged.component.uuid
                ) {
                  continue;
                }
                const iidOf = (inst: ObjInst) => bundler.addrOfUnsafe(inst).iid;
                const sameArg = (tpl: TplComponent, ancArg: Arg) =>
                  findEquivVS(tpl, vs)?.args.find(
                    (arg) => iidOf(arg) === iidOf(ancArg),
                  );
                for (const ancArg of findEquivVS(tplAnc, vs)?.args ?? []) {
                  const [leftArg, rightArg] = [tplA, tplB].map((tpl) =>
                    sameArg(tpl, ancArg),
                  );
                  if (
                    !leftArg ||
                    !rightArg ||
                    isSlot(ancArg.param) ||
                    leftArg.param.uuid === rightArg.param.uuid
                  ) {
                    continue;
                  }
                  const edited = (arg: Arg) =>
                    !instUtil.deepEquals(arg.expr, ancArg.expr, true);
                  if (
                    !edited(leftArg) ||
                    !edited(rightArg) ||
                    instUtil.deepEquals(leftArg.expr, rightArg.expr, true)
                  ) {
                    continue;
                  }
                  const name = ancArg.param.variable.name;
                  const mergedArgs = vs.args.filter(
                    (arg) =>
                      !isSlot(arg.param) && arg.param.variable.name === name,
                  );
                  if (mergedArgs.length !== 1) {
                    continue;
                  }
                  askWhichValue(name, (side) => {
                    mergedArgs[0].expr =
                      side === "left"
                        ? cloneContentsToMergedSite(
                            leftArg.expr,
                            siteA,
                            mergedSite,
                            bundler,
                          )
                        : cloneContentsToMergedSite(
                            rightArg.expr,
                            siteB,
                            mergedSite,
                            bundler,
                          );
                  });
                }
              }
            }
          } else if (
            tplAnc &&
            !tplA !== !tplB &&
            isDefaultContentEditedOnOneBranch(
              tplAnc,
              ensure(tplA ?? tplB, "One branch has it"),
              tplA ? tplInBByUuid : tplInAByUuid,
            )
          ) {
            // The other branch didn't edit this element; its dependency
            // upgrade only rebuilt the default content around it. So its
            // version is the ancestor's, and merging against the ancestor
            // applies this branch's edit.
            const ancCtx = {
              node: tplAnc,
              site: siteAncestorCtx.site,
              path: [
                ...getCompPath(ancestorComp, bundler),
                ...ensure(
                  nodeToPathAnc.get(tplAnc),
                  "Path to tplNode must exist.",
                ),
              ],
            };
            const [keptTpl, keptSite, keptComp, keptPaths] = tplA
              ? ([tplA, siteA, compA, nodeToPathA] as const)
              : ([
                  ensure(tplB, "One branch has it"),
                  siteB,
                  compB,
                  nodeToPathB,
                ] as const);
            const keptCtx = {
              node: keptTpl,
              site: keptSite,
              path: [
                ...getCompPath(keptComp, bundler),
                ...ensure(
                  keptPaths.get(keptTpl),
                  "Path to tplNode must exist.",
                ),
              ],
            };
            directConflicts.push(
              ...getDirectConflicts({
                ancestorCtx: ancCtx,
                leftCtx: tplA ? keptCtx : ancCtx,
                rightCtx: tplA ? ancCtx : keptCtx,
                mergedCtx: {
                  node: tplMerged,
                  site: mergedSiteCtx.site,
                  path: [
                    ...getCompPath(mergedComp, bundler),
                    ...nodePathMerged,
                  ],
                },
                bundler,
                picks,
                recorder,
              }),
            );
          }
        },
      );

      for (const tplMerged of flattenComponent(mergedComp)) {
        const tplA = tplInAByUuid.get(tplMerged.uuid);
        const tplB = tplInBByUuid.get(tplMerged.uuid);
        const tplAnc = tplInAncestorByUuid.get(tplMerged.uuid);

        if (tplMerged.parent && tplAnc && (!tplA || !tplB)) {
          const keptTpl = tplA ?? tplB;
          if (
            keptTpl &&
            isDefaultContentEditedOnOneBranch(
              tplAnc,
              keptTpl,
              tplA ? tplInBByUuid : tplInAByUuid,
            )
          ) {
            // The walk above already applied the kept branch's changes.
            continue;
          }

          // Deleted in one branch, remove it as it might have been moved

          const changedTplAndBranch = tplA
            ? ([tplA, siteA] as const)
            : tplB
              ? ([tplB, siteB] as const)
              : undefined;
          if (changedTplAndBranch) {
            // If it has been deleted only in one branch, and it has been moved
            // to a new node in the other branch, we might need to update its
            // values to reflect the updated branch (e.g., tplMerged.parent)
            // before removing it
            const [changedTpl, branch] = changedTplAndBranch;
            const cloneFieldValue = (field: Field, v: any) =>
              cloneFieldValueToMergedSite(
                field,
                v,
                branch,
                mergedSite,
                bundler,
              );
            instUtil.allInstFields(tplMerged).forEach((f) => {
              tplMerged[f.name] = cloneFieldValue(f, changedTpl[f.name]);
            });
          }

          if (tplMerged.parent) {
            switchType(tplMerged.parent)
              .when([TplTag, TplSlot], (parentTagOrSlot) => {
                if (isKnownTplTag(parentTagOrSlot)) {
                  parentTagOrSlot.children = parentTagOrSlot.children.filter(
                    (child) => tplMerged.uuid !== child.uuid,
                  );
                } else {
                  parentTagOrSlot.defaultContents =
                    parentTagOrSlot.defaultContents.filter(
                      (child) => tplMerged.uuid !== child.uuid,
                    );
                }
              })
              .when(TplComponent, (parentTplComp) => {
                getSlotArgs(parentTplComp).forEach((arg) => {
                  if (isKnownRenderExpr(arg.expr)) {
                    arg.expr.tpl = arg.expr.tpl.filter(
                      (tpl) => tpl.uuid !== tplMerged.uuid,
                    );
                  }
                });
              })
              .result();
          }
        }
      }

      if (mergedComp.tplTree.parent) {
        // It's also possible that an existing node became the root (although
        // not very common). In this case, we fix the parent here.
        mergedComp.tplTree.parent = null;
      }

      // We already handled parent conflicts, so we can safely ensure that the
      // parent pointers are valid now without loss of information.
      fixParentPointers(mergedComp.tplTree);
    }
  });

  return directConflicts;
};

export const mergeTplNodeChildren: MergeSpecialFieldHandler<TplNode> = (
  ancestorCtx,
  leftCtx,
  rightCtx,
  mergedCtx,
  bundler,
  picks,
) => {
  const [ancestor, left, right, merged] = [
    ancestorCtx,
    leftCtx,
    rightCtx,
    mergedCtx,
  ].map((ctx) =>
    ensure(ctx.node, "mergeTplNodeChildren expects all nodes to exist"),
  );
  const conflicts: DirectConflict[] = [];
  assertSameInstType(ancestor, left, right, merged);

  const getNonVirtualArgUuids = (tpl: TplNode) =>
    withoutNils(
      tpl.vsettings[0].args.map((arg) =>
        isKnownRenderExpr(arg.expr) && !isKnownVirtualRenderExpr(arg.expr)
          ? arg.param.uuid
          : null,
      ),
    );

  if (
    [left, right, merged].every(
      (tpl) =>
        arrayEq(
          tplChildren(tpl).map((child) => child.uuid),
          tplChildren(ancestor).map((child) => child.uuid),
        ) &&
        arrayEq(getNonVirtualArgUuids(tpl), getNonVirtualArgUuids(ancestor)),
    )
  ) {
    // No changes, early exit
    return [];
  }

  switchType(ancestor)
    .when([TplTag, TplSlot], (anc) => {
      const ancChildren = isKnownTplTag(anc)
        ? anc.children
        : anc.defaultContents;
      const leftChildren = isKnownTplTag(left)
        ? left.children
        : (left as TplSlot).defaultContents;
      const getMergedChildren = (): ReadonlyArray<TplNode> =>
        isKnownTplTag(merged)
          ? merged.children
          : (merged as TplSlot).defaultContents;
      // Edits a copy of the merged children, then assigns it back
      const updateMergedChildren = (update: (children: TplNode[]) => void) => {
        const children = [...getMergedChildren()];
        update(children);
        if (isKnownTplTag(merged)) {
          merged.children = children;
        } else {
          (merged as TplSlot).defaultContents = children;
        }
      };
      const mergedChildren = getMergedChildren();
      const rightChildren = isKnownTplTag(right)
        ? right.children
        : (right as TplSlot).defaultContents;

      const commonIids = [leftChildren, rightChildren, mergedChildren].reduce(
        (previous, children) =>
          xIntersect(
            previous,
            new Set(children.map((node) => bundler.addrOfUnsafe(node).iid)),
          ),
        new Set(ancChildren.map((node) => bundler.addrOfUnsafe(node).iid)),
      );

      const mergedNodeByIid = keyBy(
        mergedChildren,
        (child) => bundler.addrOfUnsafe(child).iid,
      );
      const previousOrder = ancChildren
        .map((child) => bundler.addrOfUnsafe(child).iid)
        .filter((iid) => commonIids.has(iid));
      let finalOrder: string[] | "conflict" = mergedChildren
        .map((child) => bundler.addrOfUnsafe(child).iid)
        .filter((iid) => commonIids.has(iid));
      const leftOrder = leftChildren
        .map((child) => bundler.addrOfUnsafe(child).iid)
        .filter((iid) => commonIids.has(iid));
      const rightOrder = rightChildren
        .map((child) => bundler.addrOfUnsafe(child).iid)
        .filter((iid) => commonIids.has(iid));
      if (
        !arrayEq(previousOrder, leftOrder) &&
        !arrayEq(previousOrder, rightOrder) &&
        !arrayEq(leftOrder, rightOrder)
      ) {
        finalOrder = "conflict";
      } else if (!arrayEq(finalOrder, leftOrder)) {
        finalOrder = leftOrder;
      } else if (!arrayEq(finalOrder, rightOrder)) {
        finalOrder = rightOrder;
      }

      // Puts the common children in `order`, leaving the others in place
      const applyOrder = (children: TplNode[], order: string[]) => {
        let nextIidIndex = 0;
        range(children.length).forEach((i) => {
          const iid = bundler.addrOfUnsafe(children[i]).iid;
          if (commonIids.has(iid)) {
            if (order[nextIidIndex] !== iid) {
              children[i] = ensure(
                mergedNodeByIid[order[nextIidIndex]],
                `Don't know about iid ${order[nextIidIndex]}`,
              );
            }
            nextIidIndex++;
          }
        });
      };

      // Without a conflict, the order is applied below with the other changes
      const orderToApply = finalOrder === "conflict" ? undefined : finalOrder;
      if (finalOrder === "conflict") {
        const pathStr = JSON.stringify(mergedCtx.path);
        const conf: SpecialDirectConflict = {
          conflictType: "special",
          conflictParts: [`tpl ${merged.uuid} children order`],
          objectInsts: [left, right],
          objectType: "components",
          pathStr: pathStr,
          pickSide: (side) => {
            const order = side === "left" ? leftOrder : rightOrder;
            updateMergedChildren((children) => applyOrder(children, order));
          },
        };

        if (picks) {
          const side = ensure(
            picks[pathStr],
            `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
              Object.keys(picks),
            )}`,
          );
          conf.pickSide(side);
        } else {
          conflicts.push(conf);
        }
      }

      const equivOnBranch = (node: TplNode, branch: Site) =>
        bundler.objByAddr({
          uuid: bundler.addrOfUnsafe(branch).uuid,
          iid: bundler.addrOfUnsafe(node).iid,
        });

      const deletedUuids = new Set(
        ancChildren
          .filter((child) =>
            [leftCtx, rightCtx].some(
              (branch) => !equivOnBranch(child, branch.site),
            ),
          )
          .map((child) => child.uuid),
      );

      // Reorders, removes and inserts children in one write
      updateMergedChildren((mergedChildrenDraft) => {
        if (orderToApply) {
          applyOrder(mergedChildrenDraft, orderToApply);
        }
        removeWhere(mergedChildrenDraft, (child) =>
          deletedUuids.has(child.uuid),
        );
        (
          [
            [leftChildren, leftCtx],
            [rightChildren, rightCtx],
          ] as const
        ).forEach(([children, branch]) => {
          children
            .filter((child) => !equivOnBranch(child, ancestorCtx.site))
            .forEach((child) => {
              const previousUuids = new Set(
                children
                  .slice(0, children.indexOf(child))
                  .map(({ uuid }) => uuid),
              );
              const index = findLastIndex(mergedChildrenDraft, (node) =>
                previousUuids.has(node.uuid),
              );
              mergedChildrenDraft.splice(
                index + 1,
                0,
                cloneObjInstToMergedSite(
                  child,
                  branch.site,
                  mergedCtx.site,
                  bundler,
                ),
              );
            });
        });
      });
    })
    .when(TplComponent, (anc) => {
      assert(
        isKnownTplComponent(left) &&
          isKnownTplComponent(right) &&
          isKnownTplComponent(merged),
        `Already checked equivalent inst types`,
      );
      // Each site can be on a different version of the instance's component.
      const getMergedParam = (tpl: TplComponent, arg: Arg) =>
        getMatchingParam(merged.component, tpl.component, arg.param);

      const getFilteredSlotArgs = (tpl: TplComponent) =>
        getSlotArgs(tpl).filter((arg) => !!getMergedParam(tpl, arg));

      const tplFilteredChildren = (tpl: TplComponent) =>
        getFilteredSlotArgs(tpl).flatMap((arg) =>
          isKnownRenderExpr(arg.expr) ? arg.expr.tpl : [],
        );

      const ancChildren = tplFilteredChildren(anc);
      const leftChildren = tplFilteredChildren(left);
      const rightChildren = tplFilteredChildren(right);
      const mergedChildren = tplFilteredChildren(merged);

      const mergedNodeByIid = keyBy(
        mergedChildren,
        (child) => bundler.addrOfUnsafe(child).iid,
      );

      // First get the nodes that haven't changed but might have moved
      const commonIids = [leftChildren, rightChildren, mergedChildren].reduce(
        (previous, children) =>
          xIntersect(
            previous,
            new Set(children.map((node) => bundler.addrOfUnsafe(node).iid)),
          ),
        new Set(ancChildren.map((node) => bundler.addrOfUnsafe(node).iid)),
      );

      // Then compute their relative order along with their respective arg.param
      const computeOrderOfCommonNodes = (tpl: TplComponent) => {
        return sortBy(
          getFilteredSlotArgs(tpl)
            .map(
              (arg) =>
                [
                  ensure(getMergedParam(tpl, arg), "Slot args are filtered")
                    .uuid,
                  isKnownVirtualRenderExpr(arg.expr)
                    ? ("VirtualRenderExpr" as const)
                    : ensureKnownRenderExpr(arg.expr)
                        .tpl.map((tpl) => bundler.addrOfUnsafe(tpl).iid)
                        .filter((iid) => commonIids.has(iid)),
                ] as const,
            )
            .filter(([_uuid, iids]) => iids.length > 0),
          ([uuid]) => uuid,
        );
      };

      const previousOrder = computeOrderOfCommonNodes(anc);
      const leftOrder = computeOrderOfCommonNodes(left);
      const rightOrder = computeOrderOfCommonNodes(right);

      // Even tough merged is initialized with the ancestor state, at this point reparenting
      // from `updateParent` was already done, so it's not recommended to assume any similarity
      // with the previousOrder
      let finalOrder: typeof previousOrder | "conflict" =
        computeOrderOfCommonNodes(merged);

      // Detect conflict if the relative order of the same elements changed in
      // more than one branch
      if (
        !isEqual(previousOrder, leftOrder) &&
        !isEqual(previousOrder, rightOrder) &&
        !isEqual(leftOrder, rightOrder)
      ) {
        finalOrder = "conflict";
      } else if (!isEqual(previousOrder, leftOrder)) {
        finalOrder = leftOrder;
      } else if (!isEqual(previousOrder, rightOrder)) {
        finalOrder = rightOrder;
      }

      // Re-order the common elements by the chosen relative order
      const applyFinalOrder = () => {
        assert(
          typeof finalOrder !== "string",
          `Expected finalOrder to be already defined`,
        );

        finalOrder.forEach(([paramUuid, maybeIids]) => {
          const mergedParam = ensure(
            merged.component.params.find((p) => p.uuid === paramUuid),
            `Couldn't find param ${paramUuid}`,
          );

          if (maybeIids === "VirtualRenderExpr") {
            // VirtualRenderExpr's are fixed later, this is to ensure that changes in the original
            // defaultContents are only synced back to this component, once that this content has been
            // properly merged
            //
            // Until there we keep the same reference for defaultContents in the current expr, this way
            // if this param is untouched we will keep the same content and id refs even after merging
            //
            // Check `fixVirtualSlotArgs` to see how this is done
            return;
          }
          const iids: string[] = maybeIids;

          let index = 0;
          // Compute the final children applying the chosen relative order for
          // the common nodes
          const mergedArgChildren = withoutNils(
            (
              maybe(
                $$$(merged).getSlotArgForParam(mergedParam),
                (mergedArg) => [...ensureKnownRenderExpr(mergedArg.expr).tpl],
              ) ?? []
            ).map((tpl) => {
              const iid = bundler.addrOfUnsafe(tpl).iid;
              if (!commonIids.has(iid)) {
                // Only consider the common elements to re-order
                return tpl;
              }
              if (index >= iids.length) {
                return null;
              }

              const newTpl = ensure(
                mergedNodeByIid[iids[index]],
                `Don't know about iid ${iids[index]}`,
              );
              index++;
              return newTpl;
            }),
          );

          while (index < iids.length) {
            mergedArgChildren.push(
              ensure(
                mergedNodeByIid[iids[index]],
                `Don't know about iid ${iids[index]}`,
              ),
            );
            index++;
          }

          setMergedSlotArg(merged, mergedParam, (mergedExpr) => {
            mergedExpr.tpl = [...mergedArgChildren];
            if (isKnownVirtualRenderExpr(mergedExpr)) {
              return new RenderExpr({
                tpl: [...mergedExpr.tpl],
              });
            } else {
              return mergedExpr;
            }
          });
        });
      };

      if (finalOrder === "conflict") {
        const pathStr = JSON.stringify(mergedCtx.path);
        const conf: SpecialDirectConflict = {
          conflictType: "special",
          conflictParts: [`tpl ${merged.uuid} children order`],
          objectInsts: [left, right],
          objectType: "components",
          pathStr: pathStr,
          pickSide: (side) => {
            finalOrder = side === "left" ? leftOrder : rightOrder;
            applyFinalOrder();
          },
        };

        if (picks) {
          const side = ensure(
            picks[pathStr],
            `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
              Object.keys(picks),
            )}`,
          );
          conf.pickSide(side);
        } else {
          conflicts.push(conf);
        }
      } else {
        applyFinalOrder();
      }

      const equivOnBranch = (node: TplNode, branch: Site) =>
        bundler.objByAddr({
          uuid: bundler.addrOfUnsafe(branch).uuid,
          iid: bundler.addrOfUnsafe(node).iid,
        });

      // Handle deleted children
      ancChildren
        .filter((child) =>
          [leftCtx, rightCtx].some(
            (branch) => !equivOnBranch(child, branch.site),
          ),
        )
        .forEach((child) =>
          getSlotArgs(merged).forEach((arg) => {
            if (isKnownRenderExpr(arg.expr)) {
              arg.expr.tpl = arg.expr.tpl.filter(
                (tpl) => tpl.uuid !== child.uuid,
              );
            }
          }),
        );

      // Handle new nodes
      (
        [
          [leftChildren, left, leftCtx],
          [rightChildren, right, rightCtx],
        ] as const
      ).forEach(([children, parent, branch]) => {
        children
          .filter((child) => !equivOnBranch(child, ancestorCtx.site))
          .forEach((child) => {
            const arg = $$$(parent).getArgContainingTpl(child);
            const expr = ensureKnownRenderExpr(arg.expr);
            const previousUuids = new Set(
              expr.tpl
                .slice(
                  0,
                  expr.tpl.findIndex((v) => v === child),
                )
                .map(({ uuid }) => uuid),
            );

            const mergedParam = ensure(
              getMergedParam(parent, arg),
              "Children are taken from filtered slot args",
            );

            setMergedSlotArg(merged, mergedParam, (mergedExpr) => {
              const argTpls = [...mergedExpr.tpl];
              const index = findLastIndex(argTpls, (node) =>
                previousUuids.has(node.uuid),
              );
              argTpls.splice(
                index + 1,
                0,
                cloneObjInstToMergedSite(
                  child,
                  branch.site,
                  mergedCtx.site,
                  bundler,
                ),
              );
              mergedExpr.tpl = argTpls;
              return mergedExpr;
            });
          });
      });

      // A slot that shows default content at the ancestor and that only one
      // branch edited takes that branch's content, while the other branch
      // still shows default content, which its own dependency upgrade may
      // have rebuilt with new elements. Otherwise the slot stays default
      // content, and the dependency upgrade at the end of the merge refills
      // it with the kit's default.
      const isDefaultContent = (arg: Arg | undefined): arg is Arg =>
        !!arg && isKnownVirtualRenderExpr(arg.expr);
      const isEditedContent = (arg: Arg | undefined): arg is Arg =>
        !!arg && !isKnownVirtualRenderExpr(arg.expr);

      for (const ancArg of getFilteredSlotArgs(anc)) {
        if (!isKnownVirtualRenderExpr(ancArg.expr)) {
          continue;
        }

        const mergedParam = ensure(
          getMergedParam(anc, ancArg),
          "Slot args are filtered",
        );
        const [leftArg, rightArg] = [left, right].map((tpl) =>
          getFilteredSlotArgs(tpl).find(
            (arg) => getMergedParam(tpl, arg) === mergedParam,
          ),
        );
        const edited =
          isEditedContent(leftArg) && isDefaultContent(rightArg)
            ? { arg: leftArg, ctx: leftCtx, otherCtx: rightCtx }
            : isEditedContent(rightArg) && isDefaultContent(leftArg)
              ? { arg: rightArg, ctx: rightCtx, otherCtx: leftCtx }
              : undefined;
        if (!edited) {
          continue;
        }

        const defaultUuids = new Set(ancArg.expr.tpl.map((tpl) => tpl.uuid));
        setMergedSlotArg(
          merged,
          mergedParam,
          () =>
            new RenderExpr({
              tpl: ensureKnownRenderExpr(edited.arg.expr)
                .tpl.filter(
                  // Leave out elements the other branch deleted, unless they
                  // were default content it only rebuilt.
                  (child) =>
                    defaultUuids.has(child.uuid) ||
                    !equivOnBranch(child, ancestorCtx.site) ||
                    !!equivOnBranch(child, edited.otherCtx.site),
                )
                .map((child) =>
                  cloneObjInstToMergedSite(
                    child,
                    edited.ctx.site,
                    mergedCtx.site,
                    bundler,
                  ),
                ),
            }),
        );
      }
    })
    .result();

  return conflicts;
};

function findEquivVS(node: TplNode, vs: VariantSetting) {
  const variantKeys = vs.variants.map((v) => toVariantKey(v));
  return node.vsettings.find((vs2) =>
    arrayEqIgnoreOrder(
      variantKeys,
      vs2.variants.map((v) => toVariantKey(v)),
    ),
  );
}

export const mergeVSettings: MergeSpecialFieldHandler<TplNode> = (
  ancestorCtx,
  leftCtx,
  rightCtx,
  mergedCtx,
  bundler,
  picks,
  recorder,
) => {
  const [ancestor, left, right, merged] = [
    ancestorCtx,
    leftCtx,
    rightCtx,
    mergedCtx,
  ].map((ctx) => ensure(ctx.node, "mergeVSettings expects all nodes to exist"));
  const conflicts: DirectConflict[] = [];
  if (isKnownTplComponent(ancestor)) {
    conflicts.push(
      ...mergeTplNodeChildren(
        ancestorCtx,
        leftCtx,
        rightCtx,
        mergedCtx,
        bundler,
        picks,
        recorder,
      ),
    );
  }

  ancestor.vsettings.forEach((vs, i) => {
    const leftEquiv = findEquivVS(left, vs);
    const rightEquiv = findEquivVS(right, vs);
    const mergedEquiv = findEquivVS(merged, vs);
    if (!leftEquiv || !rightEquiv || !mergedEquiv) {
      merged.vsettings = merged.vsettings.filter((vs2) => vs2 !== mergedEquiv);
    } else {
      conflicts.push(
        ...getDirectConflicts({
          ancestorCtx: {
            node: vs,
            path: [...ancestorCtx.path, "vsettings", `${i}`],
            site: ancestorCtx.site,
          },
          leftCtx: {
            node: leftEquiv,
            path: [
              ...leftCtx.path,
              "vsettings",
              `${left.vsettings.indexOf(leftEquiv)}`,
            ],
            site: leftCtx.site,
          },
          rightCtx: {
            node: rightEquiv,
            path: [
              ...rightCtx.path,
              "vsettings",
              `${right.vsettings.indexOf(rightEquiv)}`,
            ],
            site: rightCtx.site,
          },
          mergedCtx: {
            node: mergedEquiv,
            path: [
              ...mergedCtx.path,
              "vsettings",
              `${merged.vsettings.indexOf(mergedEquiv)}`,
            ],
            site: mergedCtx.site,
          },
          bundler,
          picks,
          recorder,
        }),
      );
    }
  });
  // New variant settings, in order: the left ones, then the right ones that
  // the left doesn't have. A left one that the right also added is merged
  // into an empty one, and gets its conflicts checked once it's attached.
  const newLeftVSettings = left.vsettings
    .filter((vs) => !findEquivVS(ancestor, vs))
    .map((vs) => {
      const rightVs = findEquivVS(right, vs);
      if (!rightVs) {
        return {
          mergedVS: cloneObjInstToMergedSite(
            vs,
            leftCtx.site,
            mergedCtx.site,
            bundler,
          ),
        };
      }
      // Create an empty VariantSetting in the ancestor bundle
      const ancestorVS = mkVariantSetting({ variants: [] });
      // Add it to the bundler so it has an IID
      bundler.bundle(
        ancestorVS,
        bundler.addrOfUnsafe(ancestorCtx.site).uuid,
        "",
      );
      const mergedVS = cloneObjInstToMergedSite(
        ancestorVS,
        ancestorCtx.site,
        mergedCtx.site,
        bundler,
      );

      // Fix the variants
      mergedVS.variants = vs.variants.map((v) =>
        cloneObjInstToMergedSite(v, leftCtx.site, mergedCtx.site, bundler),
      );
      return { mergedVS, conflictCheck: { vs, rightVs, ancestorVS } };
    });
  const newRightVSettings = right.vsettings
    .filter((vs) => !findEquivVS(ancestor, vs) && !findEquivVS(left, vs))
    .map((vs) =>
      cloneObjInstToMergedSite(vs, rightCtx.site, mergedCtx.site, bundler),
    );
  merged.vsettings = [
    ...merged.vsettings,
    ...newLeftVSettings.map(({ mergedVS }) => mergedVS),
    ...newRightVSettings,
  ];

  for (const { mergedVS, conflictCheck } of newLeftVSettings) {
    if (!conflictCheck) {
      continue;
    }
    const { vs, rightVs, ancestorVS } = conflictCheck;
    conflicts.push(
      ...getDirectConflicts({
        ancestorCtx: {
          node: ancestorVS,
          path: [
            ...ancestorCtx.path,
            "vsettings",
            ["new", ...vs.variants.map((v) => v.uuid)].join("-"),
          ],
          site: ancestorCtx.site,
        },
        leftCtx: {
          node: vs,
          path: [...leftCtx.path, "vsettings", `${left.vsettings.indexOf(vs)}`],
          site: leftCtx.site,
        },
        rightCtx: {
          node: rightVs,
          path: [
            ...rightCtx.path,
            "vsettings",
            `${right.vsettings.indexOf(rightVs)}`,
          ],
          site: rightCtx.site,
        },
        mergedCtx: {
          node: mergedVS,
          path: [
            ...mergedCtx.path,
            "vsettings",
            ["new", ...vs.variants.map((v) => v.uuid)].join("-"),
          ],
          site: mergedCtx.site,
        },
        bundler,
        picks,
        recorder,
      }),
    );
  }
  return conflicts;
};

export function fixDuplicatedCodeComponents(mergedSite: Site) {
  const codeComponentsByName: Record<string, CodeComponent[]> = {};
  mergedSite.components.forEach((c) => {
    if (isCodeComponent(c)) {
      const componentsList = codeComponentsByName[c.name] ?? [];
      componentsList.push(c);
      codeComponentsByName[c.name] = componentsList;
    }
  });
  const duplicatedComponents = new Set<Component>();
  Object.values(codeComponentsByName).forEach((components) => {
    const toComponent = components[0];
    components.slice(1).forEach((duplicatedComponent) => {
      const toParams = new Map(
        toComponent.params.map((p) => tuple(p.variable.name, p)),
      );
      visitComponentRefs(mergedSite, duplicatedComponent, (tplComponent) => {
        tplComponent.component = toComponent;
        tplComponent.vsettings.forEach((vs) => {
          vs.args = withoutNils(
            vs.args.map((arg) => {
              const name = arg.param.variable.name;
              const newParam = toParams.get(name);
              if (!newParam) {
                return undefined;
              }
              arg.param = newParam;
              return arg;
            }),
          );
        });
      });
      attachRenderableTplSlots(toComponent);
      duplicatedComponents.add(duplicatedComponent);
    });
  });
  mergedSite.components = mergedSite.components.filter(
    (c) => !duplicatedComponents.has(c),
  );
  // Also fix duplicated params
  const codeComponents = mergedSite.components.filter(isCodeComponent);
  if (codeComponents.length === 0) {
    return;
  }
  const paramsByNameByComponent = new Map<Component, Record<string, Param[]>>(
    codeComponents.map((component) =>
      tuple(
        component,
        groupBy(component.params, (p) => p.variable.name),
      ),
    ),
  );
  // A single pass over the site instead of one visitComponentRefs per code
  // component, which rebuilds the referencers map of the whole site every call.
  const fixTplComponentArgs = (tplComponent: TplComponent) => {
    const paramsByName = paramsByNameByComponent.get(tplComponent.component);
    if (!paramsByName) {
      return;
    }
    tplComponent.vsettings.forEach((vs) => {
      // Since code components can be reinstantiated and new instances of params can appear
      // in the site, we can arrive at situations where a param is duplicated in the same
      // variant setting. For the values where there is an already valid param, we keep it
      // and remove the others. But if there is no valid param, we try to convert the old
      // params to the new ones.
      const validArgsVarNameSet = new Set(
        vs.args
          .filter(
            (arg) => paramsByName[arg.param.variable.name]?.[0] === arg.param,
          )
          .map((arg) => arg.param.variable.name),
      );

      vs.args = vs.args.filter((arg) => {
        const name = arg.param.variable.name;
        const finalParam = paramsByName[name]?.[0];
        return !(validArgsVarNameSet.has(name) && arg.param !== finalParam);
      });

      vs.args.forEach((arg) => {
        const name = arg.param.variable.name;
        const finalParam = paramsByName[name]?.[0];
        if (finalParam && finalParam !== arg.param) {
          arg.param = finalParam;
        }
      });

      vs.args = vs.args.filter((arg) => {
        const name = arg.param.variable.name;
        return !!paramsByName[name]?.[0];
      });
    });
  };
  for (const component of mergedSite.components) {
    walkTpls(component.tplTree, {
      pre(tpl) {
        if (isTplComponent(tpl)) {
          fixTplComponentArgs(tpl);
        }
      },
    });
  }
  mergedSite.globalContexts.forEach(fixTplComponentArgs);
  codeComponents.forEach((component) => {
    const paramsByName = ensure(
      paramsByNameByComponent.get(component),
      "Code component params should be grouped",
    );
    component.params = component.params.filter(
      (p) => p === paramsByName[p.variable.name][0],
    );
    attachRenderableTplSlots(component);
  });
}

/**
 * Updates the merged slot arg with some new children. We are not using
 * $$$(tpl).updateSlotParam() as it performs more invariants-preserving checks
 * and cleanups, but our merging tree may be in some inconsistent state while
 * we are performign the merge. So this does just the minimum -- fixing up the
 * parent pointer of children -- and doesn't preserve any other invariant.
 */
function setMergedSlotArg(
  merged: TplComponent,
  mergedParam: Param,
  setChildren: (expr: RenderExpr) => RenderExpr,
): RenderExpr {
  const baseVs = ensureBaseVariantSetting(merged);
  const mergedArg = getTplComponentArg(merged, baseVs, mergedParam.variable);
  const mergedExpr = setChildren(
    mergedArg && isKnownRenderExpr(mergedArg.expr)
      ? mergedArg.expr
      : new RenderExpr({ tpl: [] }),
  );
  mergedExpr.tpl.forEach((child) => (child.parent = merged));
  setTplComponentArg(merged, baseVs, mergedParam.variable, mergedExpr);
  return mergedExpr;
}

export function fixPagePaths(mergedSite: Site) {
  const tplMgr = new TplMgr({ site: mergedSite });
  const autoReconciliations: AutoReconciliation[] = [];
  tplMgr.getPageComponents().forEach((c) => {
    const newPath = tplMgr.getUniquePagePath(c.pageMeta.path, c);
    if (newPath !== c.pageMeta.path) {
      autoReconciliations.push({
        violation: "duplicate-page-path",
        mergedInst: c,
        newPath,
        origPath: c.pageMeta.path,
      });
      c.pageMeta.path = newPath;
    }
  });
  return autoReconciliations;
}

export function fixSwappedTplComponents(
  ancestor: Site,
  left: Site,
  right: Site,
  merged: Site,
) {
  const ancestorCompByUuid = new Map(
    ancestor.components.map((c) => [c.uuid, c] as const),
  );
  const leftCompByUuid = new Map(
    left.components.map((c) => [c.uuid, c] as const),
  );
  const rightCompByUuid = new Map(
    right.components.map((c) => [c.uuid, c] as const),
  );

  /* We want to replace VSettings.args wrong variant with valid VariantGroup variant,
   * hence we need to create a key with name instead of uuid in case parent exists,
   * because uuid is different for the wrong variant that we want to replace
   * and we won't be able to match it to any existing VariantGroup variant with uuid.
   */
  const toArgVariantKeyWithName = (variant: Variant) => {
    return variant.parent
      ? `${variant.parent.param.variable.name}:${variant.name}`
      : toVariantKey(variant);
  };

  merged.components.forEach((component) => {
    const ancestorComp = ancestorCompByUuid.get(component.uuid);
    const compA = leftCompByUuid.get(component.uuid);
    const compB = rightCompByUuid.get(component.uuid);
    const tplInAncestorByUuid = new Map(
      ancestorComp
        ? flattenComponent(ancestorComp).map((tpl) => [tpl.uuid, tpl])
        : [],
    );
    const tplInAByUuid = new Map(
      compA ? flattenComponent(compA).map((tpl) => [tpl.uuid, tpl]) : [],
    );
    const tplInBByUuid = new Map(
      compB ? flattenComponent(compB).map((tpl) => [tpl.uuid, tpl]) : [],
    );
    flattenComponent(component).forEach((tplMerged) => {
      if (isKnownTplComponent(tplMerged)) {
        const tplAnc = tplInAncestorByUuid.get(tplMerged.uuid);
        const tplA = tplInAByUuid.get(tplMerged.uuid);
        const tplB = tplInBByUuid.get(tplMerged.uuid);
        if (
          uniq(
            [tplAnc, tplA, tplB]
              .filter(isKnownTplComponent)
              .map((tpl) => tpl.component.uuid),
          ).length > 1
        ) {
          // Some component got swapped by another one. Remove args and
          // implicit states referencing assets from the wrong component.
          const toComponentParams = new Set(tplMerged.component.params);
          const toComponentStates = new Set(tplMerged.component.states);
          tplMerged.vsettings.forEach((vs) => {
            vs.args = vs.args.filter((arg) => toComponentParams.has(arg.param));
          });

          const componentVariantsMap = new Map(
            allComponentVariants(tplMerged.component, {
              includeSuperVariants: true,
            }).map((v) => tuple(toArgVariantKeyWithName(v), v)),
          );

          /* Fix a wrong Arg variant in VSettings by replacing it with a valid
           * variant from a list of associated param VariantGroup's variants.
           */
          for (const vs of tplMerged.vsettings) {
            for (const arg of vs.args) {
              if (isKnownVariantsRef(arg.expr)) {
                arg.expr.variants = withoutFalsy(
                  arg.expr.variants.map((v) =>
                    componentVariantsMap.get(toArgVariantKeyWithName(v)),
                  ),
                );
              }
            }
          }

          component.states = component.states.filter(
            (state) =>
              !(
                state.tplNode === tplMerged &&
                !!state.implicitState &&
                !toComponentStates.has(state.implicitState)
              ),
          );
        }
      }
    });
  });
}

export const mergeComponentVariants: MergeSpecialFieldHandler<Component> = (
  _ancCompCtx,
  aCompCtx,
  bCompCtx,
  mergedCompCtx,
  bundler,
) => {
  const cloneInst = <T extends ObjInst>(node: T, branch: Site) =>
    cloneObjInstToMergedSite(node, branch, mergedCompCtx.site, bundler);
  const [aComp, bComp, mergedComp] = [aCompCtx, bCompCtx, mergedCompCtx].map(
    (ctx) =>
      ensure(
        ctx.node,
        () => `mergeComponentVariants expects all nodes to exist`,
      ),
  );

  const variantKey = (v: Variant) => {
    assert(!v.parent, () => `Did not expect variant from VariantGroup`);
    return toVariantKey(v);
  };

  const mergedVariantKeys = new Set(
    mergedComp.variants.map((v) => variantKey(v)),
  );
  const newVariants: Variant[] = [];
  (
    [
      [aComp, aCompCtx.site],
      [bComp, bCompCtx.site],
    ] as const
  ).forEach(([component, site]) => {
    component.variants.forEach((variant) => {
      const key = variantKey(variant);
      if (!mergedVariantKeys.has(key)) {
        newVariants.push(cloneInst(variant, site));
      }
    });
  });
  const allVariants = new Set(
    [...aComp.variants, ...bComp.variants].map((v) => variantKey(v)),
  );
  mergedComp.variants = uniqBy(
    [...mergedComp.variants, ...newVariants].filter((v) =>
      allVariants.has(variantKey(v)),
    ),
    (v) => variantKey(v),
  );

  // We don't need to handle conflicts or merge the variants deeper because
  // the base variant and the style variants are pretty much immutable. So
  // just return an empty array of conflicts.
  return [];
};

export function fixVirtualSlotArgs(mergedSite: Site, recorder: ChangeRecorder) {
  const tplMgr = new TplMgr({ site: mergedSite });
  const fixedComponents = new Set<Component>();
  const allLocalComponents = new Set(mergedSite.components);
  let lastProcessedChange = 0;
  const componentToUpdatedTplSlots = new Map<Component, Set<TplSlot>>();
  const newComponents = new Set<Component>();
  const processNewChanges = () => {
    const allChanges = recorder.getChangesSoFarImmutable();
    for (
      let changeIdx = lastProcessedChange;
      changeIdx < allChanges.length;
      changeIdx++
    ) {
      const change = allChanges[changeIdx];
      const component =
        change.path &&
        (change.path.find(
          (node) => node.inst instanceof Component && node.field === "tplTree",
        )?.inst as Component | undefined);
      const tplSlot =
        change.path &&
        (change.path.find(
          (node) =>
            node.inst instanceof TplSlot && node.field === "defaultContents",
        )?.inst as TplSlot | undefined);
      if (component && tplSlot) {
        xSetDefault(componentToUpdatedTplSlots, component, () => new Set()).add(
          tplSlot,
        );
      }
      if (
        change.type == "array-splice" &&
        change.changeNode.inst === mergedSite &&
        change.changeNode.field === "components"
      ) {
        change.added.forEach((c) => newComponents.add(c));
      }
    }
    lastProcessedChange = allChanges.length;
  };
  processNewChanges();
  const fixComponent = (c: Component) => {
    if (fixedComponents.has(c) || !allLocalComponents.has(c)) {
      return;
    }
    fixedComponents.add(c);
    const dfs = (tpl: TplNode) => {
      if (isKnownTplComponent(tpl)) {
        // Make sure to fix the virtual slots of the instantiated component
        // before updating the referencing `TplComponent`
        fixComponent(tpl.component);
        // Only fill the virtual slot args for `TplSlot`s that were changed somehow
        // (and TplSlots for new components).
        processNewChanges();
        const updatedTplSlots = xSetDefault(
          componentToUpdatedTplSlots,
          tpl.component,
          () => new Set(),
        );
        if (newComponents.has(tpl.component)) {
          fillVirtualSlotContents(tplMgr, tpl);
        } else if (updatedTplSlots.size > 0) {
          fillVirtualSlotContents(
            tplMgr,
            tpl,
            Array.from(updatedTplSlots.keys()),
          );
        }
        const slots = getTplSlots(tpl.component);
        for (const slot of slots) {
          const arg = $$$(tpl).getSlotArgForParam(slot.param);
          if (arg && isKnownRenderExpr(arg.expr)) {
            // Since we try to fill only the tplSlots that were changed, it's possible that some slot expr
            // was detached while processing the merge of the different sites. So we will ensure that the child
            // nodes are properly parented to the tpl.
            arg.expr.tpl.forEach((child) => {
              child.parent = tpl;
            });
          }

          if (
            arg &&
            isKnownRenderExpr(arg.expr) &&
            !isKnownVirtualRenderExpr(arg.expr)
          ) {
            // Only need to traverse the non-virtual slot args
            arg.expr.tpl.forEach((child) => dfs(child));
          }
        }
      } else {
        tplChildren(tpl).forEach((child) => dfs(child));
      }
    };
    dfs(c.tplTree);
  };
  mergedSite.components.forEach((c) => fixComponent(c));
}

export const tryMergeGlobalContexts: MergeSpecialFieldHandler<Site> = (
  ancestorCtx,
  leftCtx,
  rightCtx,
  mergedCtx,
  bundler,
  picks,
  recorder,
): DirectConflict[] => {
  const directConflicts: DirectConflict[] = [];
  const globalContextsNames: Set<string> = new Set();
  [ancestorCtx, leftCtx, rightCtx].forEach((ctx) =>
    ctx.site.globalContexts.forEach((tpl) => {
      globalContextsNames.add(tpl.component.name);
    }),
  );

  globalContextsNames.forEach((globalContextName) => {
    let ancestorTpl = ancestorCtx.site.globalContexts.find(
      (tpl) => tpl.component.name === globalContextName,
    );
    const leftTpl = leftCtx.site.globalContexts.find(
      (tpl) => tpl.component.name === globalContextName,
    );
    const rightTpl = rightCtx.site.globalContexts.find(
      (tpl) => tpl.component.name === globalContextName,
    );

    // Deleted Global Context
    if ((!leftTpl || !rightTpl) && ancestorTpl) {
      mergedCtx.site.globalContexts = mergedCtx.site.globalContexts.filter(
        (tpl) => tpl.component.name !== globalContextName,
      );
    }
    // Added Global Context
    if (leftTpl && !rightTpl && !ancestorTpl) {
      const mergedTpl = cloneObjInstToMergedSite(
        leftTpl,
        leftCtx.site,
        mergedCtx.site,
        bundler,
      );

      mergedCtx.site.globalContexts = [
        ...mergedCtx.site.globalContexts,
        mergedTpl,
      ];
    } else if (!leftTpl && rightTpl && !ancestorTpl) {
      const mergedTpl = cloneObjInstToMergedSite(
        rightTpl!,
        rightCtx.site,
        mergedCtx.site,
        bundler,
      );
      mergedCtx.site.globalContexts = [
        ...mergedCtx.site.globalContexts,
        mergedTpl,
      ];
    }

    // Check for conflict in case it existed in both left and right
    if (leftTpl && rightTpl) {
      // We can't send an undefined ancestorTpl because special handlers do not accept it
      if (ancestorTpl === undefined) {
        const ancestorComponent = mkCodeComponent(
          globalContextName,
          { name: globalContextName, props: {}, importPath: "" },
          {},
        );
        bundler.bundle(
          ancestorComponent,
          bundler.addrOfUnsafe(ancestorCtx.site).uuid,
          "",
        );
        ancestorTpl = mkTplComponentX({
          component: ancestorComponent,
          baseVariant: mkBaseVariant(),
        });
        bundler.bundle(
          ancestorTpl,
          bundler.addrOfUnsafe(ancestorCtx.site).uuid,
          "",
        );
        const mergedTpl = cloneObjInstToMergedSite(
          ancestorTpl,
          ancestorCtx.site,
          mergedCtx.site,
          bundler,
        );
        mergedTpl.component = cloneObjInstToMergedSite(
          leftTpl.component,
          leftCtx.site,
          mergedCtx.site,
          bundler,
        );
        mergedCtx.site.globalContexts = [
          ...mergedCtx.site.globalContexts,
          mergedTpl,
        ];
      }
      const mergedTpl = ensure(
        mergedCtx.site.globalContexts.find(
          (tpl) => tpl.component.name === globalContextName,
        ),
        "If Global Context exists in both left and right site, it should also exist in the merged site",
      );

      directConflicts.push(
        ...getDirectConflicts({
          ancestorCtx: {
            node: ancestorTpl,
            path: [
              ...ancestorCtx.path,
              ...(ancestorTpl
                ? getGlobalContextPath(ancestorTpl, bundler)
                : ["globalContexts", "new"]),
            ],
            site: ancestorCtx.site,
          },
          leftCtx: {
            node: leftTpl,
            path: [...leftCtx.path, ...getGlobalContextPath(leftTpl, bundler)],
            site: leftCtx.site,
          },
          rightCtx: {
            node: rightTpl,
            path: [
              ...rightCtx.path,
              ...getGlobalContextPath(rightTpl, bundler),
            ],
            site: rightCtx.site,
          },
          mergedCtx: {
            node: mergedTpl,
            path: [
              ...mergedCtx.path,
              ...getGlobalContextPath(mergedTpl, bundler),
            ],
            site: mergedCtx.site,
          },
          bundler,
          picks,
          recorder,

          // Component conflicts will be fixed later in `fixDuplicatedCodeComponents`
          filterConflict: (conflict) => {
            const pathStr = JSON.parse(
              conflict.conflictType === "generic"
                ? conflict.conflictDetails.length > 0
                  ? conflict.conflictDetails[0].pathStr
                  : `[]`
                : conflict.pathStr,
            );
            if (
              pathStr.length === 3 &&
              pathStr[0] === "globalContexts" &&
              (pathStr[2] === "component" || pathStr[2] === "uuid")
            ) {
              return false;
            }
            return true;
          },
        }),
      );
    }
  });
  return directConflicts;
};

export const mergeComponentUpdatedAt: MergeSpecialFieldHandler<Component> = (
  ancestorCtx,
  leftCtx,
  rightCtx,
  mergedCtx,
) => {
  // Components special handlers should only be called when all the nodes exist
  const [ancestor, left, right, merged] = [
    ancestorCtx,
    leftCtx,
    rightCtx,
    mergedCtx,
  ].map((ctx) =>
    ensure(
      ctx.node,
      () => `mergeComponentUpdatedAt expects all nodes to exist`,
    ),
  );

  // If the ancestor is nil, we will use the merge as a point to mark the component as updated
  // since this component will be included in the merge algorithm.
  if (isNil(ancestor.updatedAt)) {
    merged.updatedAt = Date.now();
    return [];
  }

  const isLeftUnchanged = left.updatedAt === ancestor.updatedAt;
  const isRightUnchanged = right.updatedAt === ancestor.updatedAt;

  if (isLeftUnchanged && isRightUnchanged) {
    assert(
      merged.updatedAt === ancestor.updatedAt,
      () => `Merged component should have the same updatedAt as the ancestor`,
    );
  } else if (isLeftUnchanged) {
    merged.updatedAt = right.updatedAt;
  } else if (isRightUnchanged) {
    merged.updatedAt = left.updatedAt;
  } else {
    // If the component was changed in both left and right, we need to set a new updatedAt
    // it means that there was some parallel work, so even if it's conflict-less, we will
    // set a new updatedAt to make sure it will be a meaningful value for future merges.
    merged.updatedAt = Date.now();
  }

  // No conflicts, it won't be controlled by the user
  return [];
};

/**
 * Infers the components that were updated by operations in the left and right branches.
 *
 * @param ancestor
 * @param left
 * @param right
 * @returns A set of component uuids of the components that were updated and should be considered in the merge.
 */
export function inferUpdatedComponents(
  ancestor: Site,
  left: Site,
  right: Site,
) {
  const leftComponentsUpdatedAt = Object.fromEntries(
    left.components.map((component) => [component.uuid, component.updatedAt]),
  );
  const rightComponentsUpdatedAt = Object.fromEntries(
    right.components.map((component) => [component.uuid, component.updatedAt]),
  );
  const updatedComponents = ancestor.components.filter((component) => {
    if (isNil(component.updatedAt)) {
      // If the component doesn't have an updatedAt, it means it was created before the tracking, so we can't
      // know if it was updated or not. We will assume it was updated so that it's considered in the merge.
      return true;
    }
    const hasLeftChanged =
      leftComponentsUpdatedAt[component.uuid] !== component.updatedAt;
    const hasRightChanged =
      rightComponentsUpdatedAt[component.uuid] !== component.updatedAt;
    return hasLeftChanged || hasRightChanged;
  });

  return new Set(updatedComponents.map((component) => component.uuid));
}

/**
 * Fixes page arena frame ordering and screen variants after a merge operation.
 *
 * During merge, ArenaFrameRow.cols are merged as unordered arrays, which can disrupt
 * the proper column ordering based on responsive strategy.
 *
 * This function:
 * 1. Reorders page arena columns according to the site's responsive strategy (mobile-first
 *    or desktop-first)
 * 2. Ensures screen variants are properly activated for all page arenas
 */
export function fixPageArenaFramesOrderingAndScreenVariants(mergedSite: Site) {
  reorderPageArenaCols(mergedSite);
  mergedSite.pageArenas.forEach((arena) => {
    ensureActivatedScreenVariantsForArena(mergedSite, arena);
  });
}
