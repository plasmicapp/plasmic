import {
  fillVirtualSlotContents,
  getSlotArgs,
  getSlotParams,
  getTplSlots,
} from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  BASE_VARIANT_NAME,
  isBaseVariant,
  mkBaseVariant,
  mkVariantSetting,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  attachRenderableTplSlots,
  mkCodeComponent,
} from "@/wab/shared/code-components/code-components";
import {
  arrayEq,
  arrayEqIgnoreOrder,
  assert,
  ensure,
  maybe,
  remove,
  removeWhere,
  switchType,
  tuple,
  withoutNils,
  xIntersect,
  xSetDefault,
} from "@/wab/shared/common";
import { CodeComponent, isCodeComponent } from "@/wab/shared/core/components";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { visitComponentRefs } from "@/wab/shared/core/sites";
import {
  fixParentPointers,
  mkTplComponentX,
  tplChildren,
  trackComponentRoot,
  trackComponentSite,
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
  VirtualRenderExpr,
  ensureKnownRenderExpr,
  ensureKnownTplComponent,
  ensureKnownTplSlot,
  ensureKnownTplTag,
  isKnownRenderExpr,
  isKnownTplComponent,
  isKnownTplTag,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { Field } from "@/wab/shared/model/model-meta";
import { assertSameInstType } from "@/wab/shared/model/model-tree-util";
import {
  AutoReconciliation,
  DirectConflict,
  SpecialDirectConflict,
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
      field: meta.getFieldByName("Site", "components"),
    }),
  ];
}

function getGlobalContextPath(globalContext: TplComponent, bundler: Bundler) {
  return [
    "globalContexts",
    getArrayKey(bundler, globalContext, {
      cls: meta.clsByName["Site"],
      field: meta.getFieldByName("Site", "globalContexts"),
    }),
  ];
}

function getNewAndDeletedComponents(
  ancestorComponents: Component[],
  components: Component[]
) {
  return {
    added: components.filter(
      (c) => !ancestorComponents.find((anc) => anc.uuid === c.uuid)
    ),
    deleted: ancestorComponents.filter(
      (anc) => !components.find((c) => c.uuid === anc.uuid)
    ),
  };
}

// Updates `mergedTpl.parent` to be `branchTpl.parent`
// (and fix the children pointers)
function updateParent(
  mergedTpl: TplNode,
  tplInBranch: TplNode,
  cloneInst: (tpl: TplNode) => TplNode
) {
  const oldParent = mergedTpl.parent;
  const newParent = tplInBranch.parent && cloneInst(tplInBranch.parent);
  mergedTpl.parent = newParent;
  if (oldParent) {
    // Remove the pointer in the old parent
    switchType(oldParent)
      .when(TplTag, (tpl) =>
        removeWhere(tpl.children, (child) => child === mergedTpl)
      )
      .when(TplSlot, (tpl) =>
        removeWhere(tpl.defaultContents, (child) => child === mergedTpl)
      )
      .when(TplComponent, (tpl) =>
        [...(tryGetBaseVariantSetting(tpl)?.args ?? [])].forEach(
          (arg) =>
            isKnownRenderExpr(arg.expr) &&
            removeWhere(arg.expr.tpl, (child) => child === mergedTpl)
        )
      )
      .result();
  }
  if (newParent && !tplChildren(newParent).includes(mergedTpl)) {
    // Update the children for the new parent
    const parentInBranch = ensure(
      tplInBranch.parent,
      `Updated parent must come from branchTpl`
    );
    let childrenArrayToUpdate: TplNode[] = [];
    let childrenArrayInBranch: TplNode[] = [];
    switchType(newParent)
      .when(TplTag, (tpl) => {
        childrenArrayToUpdate = tpl.children;
        childrenArrayInBranch = ensureKnownTplTag(parentInBranch).children;
      })
      .when(TplSlot, (tpl) => {
        childrenArrayToUpdate = tpl.defaultContents;
        childrenArrayInBranch =
          ensureKnownTplSlot(parentInBranch).defaultContents;
      })
      .when(TplComponent, (tpl) => {
        const argInBranch = ensure(
          tryGetBaseVariantSetting(
            ensureKnownTplComponent(parentInBranch)
          )?.args.find(
            (arg) =>
              isKnownRenderExpr(arg.expr) &&
              !!arg.expr.tpl.find((child) => child.uuid === mergedTpl.uuid)
          ),
          `Couldn't find arg in parent tpl component`
        );
        const paramInBranch = argInBranch.param;
        const renderExprInBranch = ensureKnownRenderExpr(argInBranch.expr);
        const param = getSlotParams(tpl.component).find(
          (p) => p.uuid === paramInBranch.uuid
        );
        if (!param) {
          // The corresponding param has been deleted! Simply delete this node
          mergedTpl.parent = undefined;
          return;
        }
        const maybeArg = $$$(tpl).getSlotArgForParam(param);
        let arg: Arg;
        if (!maybeArg) {
          $$$(tpl)
            .getBaseArgs()
            .push(
              (arg = new Arg({ param, expr: new RenderExpr({ tpl: [] }) }))
            );
        } else {
          arg = maybeArg;
        }
        const renderExpr = ensureKnownRenderExpr(arg.expr);
        childrenArrayToUpdate = renderExpr.tpl;
        childrenArrayInBranch = renderExprInBranch.tpl;
      })
      .result();

    if (mergedTpl.parent === undefined) {
      return;
    }

    // Insert the element after all nodes that were before it in the branch
    const indexInBranch = ensure(
      childrenArrayInBranch.indexOf(tplInBranch),
      `Couldn't find node in its parent children`
    );
    childrenArrayToUpdate.splice(
      Math.max(
        ...withoutNils([
          -1,
          ...childrenArrayInBranch
            .slice(0, indexInBranch)
            .map((tpl) =>
              childrenArrayToUpdate.findIndex((tpl2) => tpl2.uuid === tpl.uuid)
            ),
        ])
      ) + 1,
      0,
      mergedTpl
    );
  }
}

function deriveKeyFuncFromClassNameAndField<
  Cls extends keyof ModelConflictsMeta,
  F extends keyof ModelConflictsMeta[Cls] & string
>(className: Cls, fieldName: F, bundler: Bundler) {
  return deriveKeyFunc(
    modelConflictsMeta[className][fieldName] as FieldConflictDescriptorMeta,
    bundler,
    {
      cls: meta.clsByName[className],
      field: meta.getFieldByName(className, fieldName),
    }
  );
}

function calcRootToNodesPaths(
  node: TplNode,
  bundler: Bundler,
  processNode: (node: TplNode, path: string[]) => void = () => null,
  currPath = ["tplTree"] as string[],
  nodeToPath = new Map<TplNode, string[]>()
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
              bundler
            )(child),
          ],
          nodeToPath
        );
      })
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
              bundler
            )(child),
          ],
          nodeToPath
        );
      })
    )
    .when(TplComponent, (_node) =>
      getSlotArgs(_node).forEach((arg) =>
        (isKnownRenderExpr(arg.expr) ? arg.expr.tpl : []).forEach(
          (child, _i) => {
            // Getting the key of the arg that contains the tpl
            const argKey = deriveKeyFuncFromClassNameAndField(
              "VariantSetting",
              "args",
              bundler
            )(arg);

            // Getting the key of the tpl in the arg
            const tplKey = deriveKeyFuncFromClassNameAndField(
              "RenderExpr",
              "tpl",
              bundler
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
              nodeToPath
            );
          }
        )
      )
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
  picks
): DirectConflict[] => {
  const [siteAncestor, siteA, siteB, mergedSite] = [
    siteAncestorCtx,
    siteACtx,
    siteBCtx,
    mergedSiteCtx,
  ].map((ctx) =>
    ensure(ctx.node, "tryMergeComponents expects all nodes to exist")
  );

  const cloneInst = <T extends ObjInst>(node: T, branch: Site) =>
    cloneObjInstToMergedSite(node, branch, mergedSite, bundler);

  const deltaA = getNewAndDeletedComponents(
    siteAncestor.components,
    siteA.components
  );
  const deltaB = getNewAndDeletedComponents(
    siteAncestor.components,
    siteB.components
  );

  const deletedUuids = new Set([
    ...deltaA.deleted.map((component) => component.uuid),
    ...deltaB.deleted.map((component) => component.uuid),
  ]);
  const deletedComps: Component[] = [];
  removeWhere(mergedSite.components, (c) => {
    const shouldDelete = deletedUuids.has(c.uuid);
    if (shouldDelete) {
      deletedComps.push(c);
    }
    return shouldDelete;
  });

  deltaA.added.forEach((c) => mergedSite.components.push(cloneInst(c, siteA)));

  deltaB.added.forEach((c) => mergedSite.components.push(cloneInst(c, siteB)));

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
  deletedComps.forEach((deletedComp) => {
    if (
      isCodeComponent(deletedComp) &&
      mergedSite.components.find(
        (c) => isCodeComponent(c) && c.name === deletedComp.name
      )
    ) {
      // Right now we make sure to add the old versions of the component to the end
      // of the list, because `fixDuplicatedCodeComponents` arbitrarly takes the
      // first version as the source of truth.
      mergedSite.components.push(deletedComp);
    }
  });

  // Checking direct conflicts between updated tpls
  const directConflicts: DirectConflict[] = [];
  siteAncestor.components.forEach((ancestorComp) => {
    const equivalentOnA = siteA.components.find(
      (comp) => ancestorComp.uuid === comp.uuid
    );
    const equivalentOnB = siteB.components.find(
      (comp) => ancestorComp.uuid === comp.uuid
    );

    if (equivalentOnA && equivalentOnB) {
      const mergedComp = ensure(
        mergedSite.components.find((comp) => ancestorComp.uuid === comp.uuid),
        `Merged site is missing component ${ancestorComp.uuid}`
      );
      const compA = equivalentOnA;
      const compB = equivalentOnB;
      directConflicts.push(
        ...getDirectConflicts(
          {
            node: ancestorComp,
            site: siteAncestorCtx.site,
            path: getCompPath(ancestorComp, bundler),
          },
          {
            node: compA,
            site: siteACtx.site,
            path: getCompPath(compA, bundler),
          },
          {
            node: compB,
            site: siteBCtx.site,
            path: getCompPath(compB, bundler),
          },
          {
            node: mergedComp,
            site: mergedSiteCtx.site,
            path: getCompPath(mergedComp, bundler),
          },
          bundler,
          picks
        )
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
                bundler
              );
            } else {
              mergedComp.tplTree = cloneObjInstToMergedSite(
                compB.tplTree,
                siteB,
                mergedSite,
                bundler
              );
            }
            fixParentPointers(mergedComp.tplTree);
          },
        };
        if (picks) {
          const side = ensure(
            picks[pathStr],
            `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
              Object.keys(picks)
            )}`
          );
          conf.pickSide(side);
        } else {
          directConflicts.push(conf);
        }
      } else if (mergedComp.tplTree.uuid !== compA.tplTree.uuid) {
        mergedComp.tplTree = cloneInst(compA.tplTree, siteA);
        fixParentPointers(mergedComp.tplTree);
      } else if (mergedComp.tplTree.uuid !== compB.tplTree.uuid) {
        mergedComp.tplTree = cloneInst(compB.tplTree, siteB);
        fixParentPointers(mergedComp.tplTree);
      }
      const tplInAncestorByUuid = new Map(
        flattenComponent(ancestorComp).map((tpl) => [tpl.uuid, tpl])
      );
      const tplInAByUuid = new Map(
        flattenComponent(compA).map((tpl) => [tpl.uuid, tpl])
      );
      const tplInBByUuid = new Map(
        flattenComponent(compB).map((tpl) => [tpl.uuid, tpl])
      );

      // Check for cycles of disconnected nodes after updating the parents
      const checkAndFixCycle = () => {
        while (true) {
          const reachableTplUuids = new Set(
            flattenComponent(mergedComp).map((tpl) => tpl.uuid)
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
              siteAncestor
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
            tplInDisconnectedCycle
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
              (tpl) => cloneInst(tpl, siteAncestor)
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
        return argContainingA.param.uuid === argContainingB.param.uuid;
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
                    cloneObjInstToMergedSite(tpl, siteA, mergedSite, bundler)
                  );
                } else {
                  updateParent(tplMerged, tplB, (tpl) =>
                    cloneObjInstToMergedSite(tpl, siteB, mergedSite, bundler)
                  );
                }
                checkAndFixCycle();
              },
            };

            if (picks) {
              const side = ensure(
                picks[pathStr],
                `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
                  Object.keys(picks)
                )}`
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
              "Path to tplNode must exist."
            );
            const nodePathA = ensure(
              nodeToPathA.get(tplA),
              "Path to tplNode must exist."
            );
            const nodePathB = ensure(
              nodeToPathB.get(tplB),
              "Path to tplNode must exist."
            );
            directConflicts.push(
              ...getDirectConflicts(
                {
                  node: tplAnc,
                  site: siteAncestorCtx.site,
                  path: [...getCompPath(ancestorComp, bundler), ...nodePathAnc],
                },
                {
                  node: tplA,
                  site: siteACtx.site,
                  path: [...getCompPath(compA, bundler), ...nodePathA],
                },
                {
                  node: tplB,
                  site: siteBCtx.site,
                  path: [...getCompPath(compB, bundler), ...nodePathB],
                },
                {
                  node: tplMerged,
                  site: mergedSiteCtx.site,
                  path: [
                    ...getCompPath(mergedComp, bundler),
                    ...nodePathMerged,
                  ],
                },
                bundler,
                picks
              )
            );
          }
        }
      );

      for (const tplMerged of flattenComponent(mergedComp)) {
        const tplA = tplInAByUuid.get(tplMerged.uuid);
        const tplB = tplInBByUuid.get(tplMerged.uuid);
        const tplAnc = tplInAncestorByUuid.get(tplMerged.uuid);

        if (tplMerged.parent && tplAnc && (!tplA || !tplB)) {
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
                bundler
              );
            instUtil.allInstFields(tplMerged).forEach((f) => {
              tplMerged[f.name] = cloneFieldValue(f, changedTpl[f.name]);
            });
          }

          if (tplMerged.parent) {
            switchType(tplMerged.parent)
              .when([TplTag, TplSlot], (parentTagOrSlot) => {
                removeWhere(
                  isKnownTplTag(parentTagOrSlot)
                    ? parentTagOrSlot.children
                    : parentTagOrSlot.defaultContents,
                  (child) => tplMerged.uuid === child.uuid
                );
              })
              .when(TplComponent, (parentTplComp) => {
                getSlotArgs(parentTplComp).forEach(
                  (arg) =>
                    isKnownRenderExpr(arg.expr) &&
                    removeWhere(
                      arg.expr.tpl,
                      (tpl) => tpl.uuid === tplMerged.uuid
                    )
                );
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
  picks
) => {
  const [ancestor, left, right, merged] = [
    ancestorCtx,
    leftCtx,
    rightCtx,
    mergedCtx,
  ].map((ctx) =>
    ensure(ctx.node, "mergeTplNodeChildren expects all nodes to exist")
  );
  const conflicts: DirectConflict[] = [];
  assertSameInstType(ancestor, left, right, merged);

  const getNonVirtualArgUuids = (tpl: TplNode) =>
    withoutNils(
      tpl.vsettings[0].args.map((arg) =>
        isKnownRenderExpr(arg.expr) && !isKnownVirtualRenderExpr(arg.expr)
          ? arg.param.uuid
          : null
      )
    );

  if (
    [left, right, merged].every(
      (tpl) =>
        arrayEq(
          tplChildren(tpl).map((child) => child.uuid),
          tplChildren(ancestor).map((child) => child.uuid)
        ) &&
        arrayEq(getNonVirtualArgUuids(tpl), getNonVirtualArgUuids(ancestor))
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
      const mergedChildren = isKnownTplTag(merged)
        ? merged.children
        : (merged as TplSlot).defaultContents;
      const rightChildren = isKnownTplTag(right)
        ? right.children
        : (right as TplSlot).defaultContents;

      const commonIids = [leftChildren, rightChildren, mergedChildren].reduce(
        (previous, children) =>
          xIntersect(
            previous,
            new Set(children.map((node) => bundler.addrOf(node).iid))
          ),
        new Set(ancChildren.map((node) => bundler.addrOf(node).iid))
      );

      const mergedNodeByIid = keyBy(
        mergedChildren,
        (child) => bundler.addrOf(child).iid
      );
      const previousOrder = ancChildren
        .map((child) => bundler.addrOf(child).iid)
        .filter((iid) => commonIids.has(iid));
      let finalOrder: string[] | "conflict" = mergedChildren
        .map((child) => bundler.addrOf(child).iid)
        .filter((iid) => commonIids.has(iid));
      const leftOrder = leftChildren
        .map((child) => bundler.addrOf(child).iid)
        .filter((iid) => commonIids.has(iid));
      const rightOrder = rightChildren
        .map((child) => bundler.addrOf(child).iid)
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
            let nextIidIndex = 0;
            range(mergedChildren.length).forEach((i) => {
              const iid = bundler.addrOf(mergedChildren[i]).iid;
              if (commonIids.has(iid)) {
                if (finalOrder[nextIidIndex] !== iid) {
                  mergedChildren[i] = ensure(
                    mergedNodeByIid[finalOrder[nextIidIndex]],
                    `Don't know about iid ${finalOrder[nextIidIndex]}`
                  );
                }
                nextIidIndex++;
              }
            });
          },
        };

        if (picks) {
          const side = ensure(
            picks[pathStr],
            `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
              Object.keys(picks)
            )}`
          );
          conf.pickSide(side);
        } else {
          conflicts.push(conf);
        }
      } else {
        let nextIidIndex = 0;
        range(mergedChildren.length).forEach((i) => {
          const iid = bundler.addrOf(mergedChildren[i]).iid;
          if (commonIids.has(iid)) {
            if (finalOrder[nextIidIndex] !== iid) {
              mergedChildren[i] = ensure(
                mergedNodeByIid[finalOrder[nextIidIndex]],
                `Don't know about iid ${finalOrder[nextIidIndex]}`
              );
            }
            nextIidIndex++;
          }
        });
      }

      const equivOnBranch = (node: TplNode, branch: Site) =>
        bundler.objByAddr({
          uuid: bundler.addrOf(branch).uuid,
          iid: bundler.addrOf(node).iid,
        });

      // Deleted children
      ancChildren
        .filter((child) =>
          [leftCtx, rightCtx].some(
            (branch) => !equivOnBranch(child, branch.site)
          )
        )
        .forEach((child) =>
          removeWhere(mergedChildren, (child2) => child.uuid === child2.uuid)
        );

      // New nodes
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
              children.slice(0, children.indexOf(child)).map(({ uuid }) => uuid)
            );
            const index = findLastIndex(mergedChildren, (node) =>
              previousUuids.has(node.uuid)
            );
            mergedChildren.splice(
              index + 1,
              0,
              cloneObjInstToMergedSite(
                child,
                branch.site,
                mergedCtx.site,
                bundler
              )
            );
          });
      });
    })
    .when(TplComponent, (anc) => {
      assert(
        isKnownTplComponent(left) &&
          isKnownTplComponent(right) &&
          isKnownTplComponent(merged),
        `Already checked equivalent inst types`
      );
      const existingSlotParams = new Set(
        getSlotParams(merged.component).map((param) => param.uuid)
      );

      const getFilteredSlotArgs = (tpl: TplComponent) =>
        getSlotArgs(tpl).filter((arg) =>
          existingSlotParams.has(arg.param.uuid)
        );

      const tplFilteredChildren = (tpl: TplComponent) =>
        getFilteredSlotArgs(tpl).flatMap((arg) =>
          isKnownRenderExpr(arg.expr) ? arg.expr.tpl : []
        );

      const ancChildren = tplFilteredChildren(anc);
      const leftChildren = tplFilteredChildren(left);
      const rightChildren = tplFilteredChildren(right);
      const mergedChildren = tplFilteredChildren(merged);

      const mergedNodeByIid = keyBy(
        mergedChildren,
        (child) => bundler.addrOf(child).iid
      );

      // First get the nodes that haven't changed but might have moved
      const commonIids = [leftChildren, rightChildren, mergedChildren].reduce(
        (previous, children) =>
          xIntersect(
            previous,
            new Set(children.map((node) => bundler.addrOf(node).iid))
          ),
        new Set(ancChildren.map((node) => bundler.addrOf(node).iid))
      );

      // Then compute their relative order along with their respective arg.param
      const computeOrderOfCommonNodes = (args: Arg[]) => {
        return sortBy(
          args
            .map(
              (arg) =>
                [
                  arg.param.uuid,
                  isKnownVirtualRenderExpr(arg.expr)
                    ? ("VirtualRenderExpr" as const)
                    : ensureKnownRenderExpr(arg.expr)
                        .tpl.map((tpl) => bundler.addrOf(tpl).iid)
                        .filter((iid) => commonIids.has(iid)),
                ] as const
            )
            .filter(([_uuid, iids]) => iids.length > 0),
          ([uuid]) => uuid
        );
      };

      const [ancArgs, leftArgs, rightArgs] = [
        getFilteredSlotArgs(anc),
        getFilteredSlotArgs(left),
        getFilteredSlotArgs(right),
      ] as const;

      const previousOrder = computeOrderOfCommonNodes(ancArgs);
      const leftOrder = computeOrderOfCommonNodes(leftArgs);
      const rightOrder = computeOrderOfCommonNodes(rightArgs);

      // Even tough merged is initialized with the ancestor state, at this point reparenting
      // from `updateParent` was already done, so it's not recommended to assume any similarity
      // with the previousOrder
      let finalOrder: typeof previousOrder | "conflict" =
        computeOrderOfCommonNodes(getFilteredSlotArgs(merged));

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
          `Expected finalOrder to be already defined`
        );

        const argsAndBranchCtx = [
          [ancArgs, ancestorCtx],
          [leftArgs, leftCtx],
          [rightArgs, rightCtx],
        ] as const;

        const getParamAndBranchCtxByUuid = (uuid: string) => {
          return ensure(
            withoutNils(
              argsAndBranchCtx.map(([args, ctx]) => {
                const arg = args.find((a) => a.param.uuid === uuid);
                if (arg) {
                  return [arg, ctx] as const;
                }
                return null;
              })
            )[0],
            `Couldn't find arg for param ${uuid}`
          );
        };

        finalOrder.forEach(([paramUuid, maybeIids]) => {
          const [arg, ctx] = getParamAndBranchCtxByUuid(paramUuid);
          const mergedParam = cloneObjInstToMergedSite(
            arg.param,
            ctx.site,
            mergedCtx.site,
            bundler
          );

          if (maybeIids === "VirtualRenderExpr") {
            $$$(merged).setSlotArgForParam(
              mergedParam,
              new VirtualRenderExpr({
                tpl: [] /* Will be fixed afterwards by `fixVirtualSlotArgs` */,
              })
            );
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
                (mergedArg) => [...ensureKnownRenderExpr(mergedArg.expr).tpl]
              ) ?? []
            ).map((tpl) => {
              const iid = bundler.addrOf(tpl).iid;
              if (!commonIids.has(iid)) {
                // Only consider the common elements to re-order
                return tpl;
              }
              if (index >= iids.length) {
                return null;
              }

              const newTpl = ensure(
                mergedNodeByIid[iids[index]],
                `Don't know about iid ${iids[index]}`
              );
              index++;
              return newTpl;
            })
          );

          while (index < iids.length) {
            mergedArgChildren.push(
              ensure(
                mergedNodeByIid[iids[index]],
                `Don't know about iid ${iids[index]}`
              )
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
              Object.keys(picks)
            )}`
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
          uuid: bundler.addrOf(branch).uuid,
          iid: bundler.addrOf(node).iid,
        });

      // Handle deleted children
      ancChildren
        .filter((child) =>
          [leftCtx, rightCtx].some(
            (branch) => !equivOnBranch(child, branch.site)
          )
        )
        .forEach((child) =>
          getSlotArgs(merged).forEach(
            (arg) =>
              isKnownRenderExpr(arg.expr) &&
              removeWhere(arg.expr.tpl, (tpl) => tpl.uuid === child.uuid)
          )
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
                  expr.tpl.findIndex((v) => v === child)
                )
                .map(({ uuid }) => uuid)
            );

            const mergedParam = cloneObjInstToMergedSite(
              arg.param,
              branch.site,
              mergedCtx.site,
              bundler
            );

            setMergedSlotArg(merged, mergedParam, (mergedExpr) => {
              const argTpls = [...mergedExpr.tpl];
              const index = findLastIndex(argTpls, (node) =>
                previousUuids.has(node.uuid)
              );
              argTpls.splice(
                index + 1,
                0,
                cloneObjInstToMergedSite(
                  child,
                  branch.site,
                  mergedCtx.site,
                  bundler
                )
              );
              mergedExpr.tpl = argTpls;
              return mergedExpr;
            });
          });
      });
    })
    .result();

  return conflicts;
};

function toVariantKey(v: Variant) {
  if (v.parent) {
    return v.uuid;
  }

  if (isBaseVariant(v)) {
    return BASE_VARIANT_NAME;
  }

  if (v.codeComponentVariantKeys) {
    return JSON.stringify({
      codeComponentName: v.codeComponentName,
      codeComponentVariantKeys: v.codeComponentVariantKeys,
    });
  }

  assert(!!v.selectors, () => `Expected style variant`);
  return JSON.stringify([
    JSON.stringify([...v.selectors].sort()),
    v.forTpl?.uuid ?? null,
  ]);
}

export const mergeVSettings: MergeSpecialFieldHandler<TplNode> = (
  ancestorCtx,
  leftCtx,
  rightCtx,
  mergedCtx,
  bundler,
  picks
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
        picks
      )
    );
  }

  const findEquivVS = (node: TplNode, vs: VariantSetting) => {
    const variantKeys = vs.variants.map((v) => toVariantKey(v));
    return node.vsettings.find((vs2) =>
      arrayEqIgnoreOrder(
        variantKeys,
        vs2.variants.map((v) => toVariantKey(v))
      )
    );
  };

  ancestor.vsettings.forEach((vs, i) => {
    const leftEquiv = findEquivVS(left, vs);
    const rightEquiv = findEquivVS(right, vs);
    const mergedEquiv = findEquivVS(merged, vs);
    if (!leftEquiv || !rightEquiv || !mergedEquiv) {
      removeWhere(merged.vsettings, (vs2) => vs2 === mergedEquiv);
    } else {
      conflicts.push(
        ...getDirectConflicts(
          {
            node: vs,
            path: [...ancestorCtx.path, "vsettings", `${i}`],
            site: ancestorCtx.site,
          },
          {
            node: leftEquiv,
            path: [
              ...leftCtx.path,
              "vsettings",
              `${left.vsettings.indexOf(leftEquiv)}`,
            ],
            site: leftCtx.site,
          },
          {
            node: rightEquiv,
            path: [
              ...rightCtx.path,
              "vsettings",
              `${right.vsettings.indexOf(rightEquiv)}`,
            ],
            site: rightCtx.site,
          },
          {
            node: mergedEquiv,
            path: [
              ...mergedCtx.path,
              "vsettings",
              `${merged.vsettings.indexOf(mergedEquiv)}`,
            ],
            site: mergedCtx.site,
          },
          bundler,
          picks
        )
      );
    }
  });
  left.vsettings
    .filter((vs) => !findEquivVS(ancestor, vs))
    .forEach((vs) => {
      const rightVs = findEquivVS(right, vs);
      if (rightVs) {
        // Create an empty VariantSetting in the ancestor bundle
        const ancestorVS = mkVariantSetting({ variants: [] });
        // Add it to the bundler so it has an IID
        bundler.bundle(ancestorVS, bundler.addrOf(ancestorCtx.site).uuid, "");
        const mergedVS = cloneObjInstToMergedSite(
          ancestorVS,
          ancestorCtx.site,
          mergedCtx.site,
          bundler
        );

        // Fix the variants
        mergedVS.variants = vs.variants.map((v) =>
          cloneObjInstToMergedSite(v, leftCtx.site, mergedCtx.site, bundler)
        );

        merged.vsettings.push(mergedVS);

        conflicts.push(
          ...getDirectConflicts(
            {
              node: ancestorVS,
              path: [
                ...ancestorCtx.path,
                "vsettings",
                ["new", ...vs.variants.map((v) => v.uuid)].join("-"),
              ],
              site: ancestorCtx.site,
            },
            {
              node: vs,
              path: [
                ...leftCtx.path,
                "vsettings",
                `${left.vsettings.indexOf(vs)}`,
              ],
              site: leftCtx.site,
            },
            {
              node: rightVs,
              path: [
                ...rightCtx.path,
                "vsettings",
                `${right.vsettings.indexOf(rightVs)}`,
              ],
              site: rightCtx.site,
            },
            {
              node: mergedVS,
              path: [
                ...mergedCtx.path,
                "vsettings",
                ["new", ...vs.variants.map((v) => v.uuid)].join("-"),
              ],
              site: mergedCtx.site,
            },
            bundler,
            picks
          )
        );
      } else {
        merged.vsettings.push(
          cloneObjInstToMergedSite(vs, leftCtx.site, mergedCtx.site, bundler)
        );
      }
    });
  right.vsettings
    .filter((vs) => !findEquivVS(ancestor, vs) && !findEquivVS(left, vs))
    .forEach((vs) => {
      merged.vsettings.push(
        cloneObjInstToMergedSite(vs, rightCtx.site, mergedCtx.site, bundler)
      );
    });
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
  Object.values(codeComponentsByName).forEach((components) => {
    const toComponent = components[0];
    components.slice(1).forEach((duplicatedComponent) => {
      const toParams = new Map(
        toComponent.params.map((p) => tuple(p.variable.name, p))
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
            })
          );
        });
      });
      attachRenderableTplSlots(toComponent);
      remove(mergedSite.components, duplicatedComponent);
    });
  });
  // Also fix duplicated params
  mergedSite.components.filter(isCodeComponent).forEach((component) => {
    const paramsByName = groupBy(component.params, (p) => p.variable.name);
    visitComponentRefs(mergedSite, component, (tplComponent) => {
      tplComponent.vsettings.forEach((vs) => {
        // Since code components can be reinstantied and new instance of params can appear
        // in the site, we can arrive at situations where a param is duplicated in the same
        // variant setting. For the values where there is an already valid param, we keep it
        // and remove the others. But if there is no valid param, we try to convert the old
        // params to the new ones.
        const validArgsVarNameSet = new Set(
          vs.args
            .filter(
              (arg) => paramsByName[arg.param.variable.name]?.[0] === arg.param
            )
            .map((arg) => arg.param.variable.name)
        );

        removeWhere(vs.args, (arg) => {
          const name = arg.param.variable.name;
          const finalParam = paramsByName[name]?.[0];
          return validArgsVarNameSet.has(name) && arg.param !== finalParam;
        });

        vs.args.forEach((arg) => {
          const name = arg.param.variable.name;
          const finalParam = paramsByName[name]?.[0];
          if (finalParam && finalParam !== arg.param) {
            arg.param = finalParam;
          }
        });

        removeWhere(vs.args, (arg) => {
          const name = arg.param.variable.name;
          return !paramsByName[name]?.[0];
        });
      });
    });
    removeWhere(
      component.params,
      (p) => p !== paramsByName[p.variable.name][0]
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
  setChildren: (expr: RenderExpr) => RenderExpr
) {
  let mergedArg = $$$(merged).getSlotArgForParam(mergedParam);
  const mergedExpr = setChildren(
    mergedArg && isKnownRenderExpr(mergedArg.expr)
      ? mergedArg.expr
      : new RenderExpr({ tpl: [] })
  );
  mergedExpr.tpl.forEach((child) => (child.parent = merged));
  if (!mergedArg) {
    mergedArg = new Arg({ expr: mergedExpr, param: mergedParam });
    $$$(merged).getBaseArgs().push(mergedArg);
  } else {
    mergedArg.expr = mergedExpr;
  }
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
  merged: Site
) {
  const ancestorCompByUuid = new Map(
    ancestor.components.map((c) => [c.uuid, c] as const)
  );
  const leftCompByUuid = new Map(
    left.components.map((c) => [c.uuid, c] as const)
  );
  const rightCompByUuid = new Map(
    right.components.map((c) => [c.uuid, c] as const)
  );
  merged.components.forEach((component) => {
    const ancestorComp = ancestorCompByUuid.get(component.uuid);
    const compA = leftCompByUuid.get(component.uuid);
    const compB = rightCompByUuid.get(component.uuid);
    const tplInAncestorByUuid = new Map(
      ancestorComp
        ? flattenComponent(ancestorComp).map((tpl) => [tpl.uuid, tpl])
        : []
    );
    const tplInAByUuid = new Map(
      compA ? flattenComponent(compA).map((tpl) => [tpl.uuid, tpl]) : []
    );
    const tplInBByUuid = new Map(
      compB ? flattenComponent(compB).map((tpl) => [tpl.uuid, tpl]) : []
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
              .map((tpl) => tpl.component.uuid)
          ).length > 1
        ) {
          // Some component got swapped by another one. Remove args and
          // implicit states referencing assets from the wrong component.
          const toComponentParams = new Set(tplMerged.component.params);
          const toComponentStates = new Set(tplMerged.component.states);
          tplMerged.vsettings.forEach((vs) => {
            removeWhere(vs.args, (arg) => !toComponentParams.has(arg.param));
          });
          removeWhere(
            component.states,
            (state) =>
              state.tplNode === tplMerged &&
              !!state.implicitState &&
              !toComponentStates.has(state.implicitState)
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
  bundler
) => {
  const cloneInst = <T extends ObjInst>(node: T, branch: Site) =>
    cloneObjInstToMergedSite(node, branch, mergedCompCtx.site, bundler);
  const [aComp, bComp, mergedComp] = [aCompCtx, bCompCtx, mergedCompCtx].map(
    (ctx) =>
      ensure(
        ctx.node,
        () => `mergeComponentVariants expects all nodes to exist`
      )
  );

  const variantKey = (v: Variant) => {
    assert(!v.parent, () => `Did not expect variant from VariantGroup`);
    return toVariantKey(v);
  };

  const mergedVariantKeys = new Set(
    mergedComp.variants.map((v) => variantKey(v))
  );
  (
    [
      [aComp, aCompCtx.site],
      [bComp, bCompCtx.site],
    ] as const
  ).forEach(([component, site]) => {
    component.variants.forEach((variant) => {
      const key = variantKey(variant);
      if (!mergedVariantKeys.has(key)) {
        mergedComp.variants.push(cloneInst(variant, site));
      }
    });
  });
  const allVariants = new Set(
    [...aComp.variants, ...bComp.variants].map((v) => variantKey(v))
  );
  removeWhere(mergedComp.variants, (v) => !allVariants.has(variantKey(v)));
  mergedComp.variants = uniqBy(mergedComp.variants, (v) => variantKey(v));

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
          (node) => node.inst instanceof Component && node.field === "tplTree"
        )?.inst as Component | undefined);
      const tplSlot =
        change.path &&
        (change.path.find(
          (node) =>
            node.inst instanceof TplSlot && node.field === "defaultContents"
        )?.inst as TplSlot | undefined);
      if (component && tplSlot) {
        xSetDefault(componentToUpdatedTplSlots, component, () => new Set()).add(
          tplSlot
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
          () => new Set()
        );
        if (newComponents.has(tpl.component)) {
          fillVirtualSlotContents(tplMgr, tpl);
        } else if (updatedTplSlots.size > 0) {
          fillVirtualSlotContents(
            tplMgr,
            tpl,
            Array.from(updatedTplSlots.keys())
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
  picks
): DirectConflict[] => {
  const directConflicts: DirectConflict[] = [];
  const globalContextsNames: Set<string> = new Set();
  [ancestorCtx, leftCtx, rightCtx].forEach((ctx) =>
    ctx.site.globalContexts.forEach((tpl) => {
      globalContextsNames.add(tpl.component.name);
    })
  );

  globalContextsNames.forEach((globalContextName) => {
    let ancestorTpl = ancestorCtx.site.globalContexts.find(
      (tpl) => tpl.component.name === globalContextName
    );
    const leftTpl = leftCtx.site.globalContexts.find(
      (tpl) => tpl.component.name === globalContextName
    );
    const rightTpl = rightCtx.site.globalContexts.find(
      (tpl) => tpl.component.name === globalContextName
    );

    // Deleted Global Context
    if ((!leftTpl || !rightTpl) && ancestorTpl) {
      removeWhere(
        mergedCtx.site.globalContexts,
        (tpl) => tpl.component.name === globalContextName
      );
    }
    // Added Global Context
    if (leftTpl && !rightTpl && !ancestorTpl) {
      const mergedTpl = cloneObjInstToMergedSite(
        leftTpl,
        leftCtx.site,
        mergedCtx.site,
        bundler
      );

      mergedCtx.site.globalContexts.push(mergedTpl);
    } else if (!leftTpl && rightTpl && !ancestorTpl) {
      const mergedTpl = cloneObjInstToMergedSite(
        rightTpl!,
        rightCtx.site,
        mergedCtx.site,
        bundler
      );
      mergedCtx.site.globalContexts.push(mergedTpl);
    }

    // Check for conflict in case it existed in both left and right
    if (leftTpl && rightTpl) {
      // We can't send an undefined ancestorTpl because special handlers do not accept it
      if (ancestorTpl === undefined) {
        const ancestorComponent = mkCodeComponent(
          globalContextName,
          { name: globalContextName, props: {}, importPath: "" },
          {}
        );
        bundler.bundle(
          ancestorComponent,
          bundler.addrOf(ancestorCtx.site).uuid,
          ""
        );
        ancestorTpl = mkTplComponentX({
          component: ancestorComponent,
          baseVariant: mkBaseVariant(),
        });
        bundler.bundle(ancestorTpl, bundler.addrOf(ancestorCtx.site).uuid, "");
        const mergedTpl = cloneObjInstToMergedSite(
          ancestorTpl,
          ancestorCtx.site,
          mergedCtx.site,
          bundler
        );
        mergedTpl.component = cloneObjInstToMergedSite(
          leftTpl.component,
          leftCtx.site,
          mergedCtx.site,
          bundler
        );
        mergedCtx.site.globalContexts.push(mergedTpl);
      }
      const mergedTpl = ensure(
        mergedCtx.site.globalContexts.find(
          (tpl) => tpl.component.name === globalContextName
        ),
        "If Global Context exists in both left and right site, it should also exist in the merged site"
      );

      directConflicts.push(
        ...getDirectConflicts(
          {
            node: ancestorTpl,
            path: [
              ...ancestorCtx.path,
              ...(ancestorTpl
                ? getGlobalContextPath(ancestorTpl, bundler)
                : ["globalContexts", "new"]),
            ],
            site: ancestorCtx.site,
          },
          {
            node: leftTpl,
            path: [...leftCtx.path, ...getGlobalContextPath(leftTpl, bundler)],
            site: leftCtx.site,
          },
          {
            node: rightTpl,
            path: [
              ...rightCtx.path,
              ...getGlobalContextPath(rightTpl, bundler),
            ],
            site: rightCtx.site,
          },
          {
            node: mergedTpl,
            path: [
              ...mergedCtx.path,
              ...getGlobalContextPath(mergedTpl, bundler),
            ],
            site: mergedCtx.site,
          },
          bundler,
          picks,

          // Component conflicts will be fixed later in `fixDuplicatedCodeComponents`
          (conflict) => {
            const pathStr = JSON.parse(
              conflict.conflictType === "generic"
                ? conflict.conflictDetails.length > 0
                  ? conflict.conflictDetails[0].pathStr
                  : `[]`
                : conflict.pathStr
            );
            if (
              pathStr.length === 3 &&
              pathStr[0] === "globalContexts" &&
              (pathStr[2] === "component" || pathStr[2] === "uuid")
            ) {
              return false;
            }
            return true;
          }
        )
      );
    }
  });
  return directConflicts;
};
