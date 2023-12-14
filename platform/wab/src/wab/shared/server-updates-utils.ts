import {
  ArenaFrame,
  ArenaFrameCell,
  ArenaFrameGrid,
  ArenaFrameRow,
  Arg,
  ArgType,
  CollectionExpr,
  ColumnsSetting,
  Component,
  ComponentArena,
  ComponentDataQuery,
  ComponentInstance,
  ComponentVariantGroup,
  CompositeExpr,
  CustomCode,
  DataSourceOpExpr,
  ensureKnownEventHandler,
  Expr,
  FunctionArg,
  FunctionExpr,
  ImageAsset,
  ImageAssetRef,
  Interaction,
  isKnownArenaFrame,
  isKnownArgType,
  isKnownComponent,
  isKnownComponentDataQuery,
  isKnownExpr,
  isKnownImageAsset,
  isKnownMixin,
  isKnownParam,
  isKnownRenderExpr,
  isKnownState,
  isKnownStyleToken,
  isKnownTheme,
  isKnownTplNode,
  isKnownVar,
  isKnownVariant,
  isKnownVariantGroup,
  isKnownVariantSetting,
  MapExpr,
  Mixin,
  NameArg,
  NodeMarker,
  ObjectPath,
  ObjInst,
  PageArena,
  PageHref,
  PageMeta,
  Param,
  QueryInvalidationExpr,
  QueryRef,
  RawText,
  RenderableType,
  RenderFuncType,
  RuleSet,
  Site,
  SlotParam,
  Split,
  SplitContent,
  SplitSlice,
  State,
  StrongFunctionArg,
  StyleToken,
  StyleTokenRef,
  Theme,
  TplComponent,
  TplNode,
  TplRef,
  TplSlot,
  TplTag,
  Var,
  Variant,
  VariantedRuleSet,
  VariantedValue,
  VariantGroup,
  VariantSetting,
  VariantsRef,
  VarRef,
} from "@/wab/classes";
import {
  arrayEqIgnoreOrder,
  assert,
  CustomError,
  ensure,
  mergeSets,
  only,
  removeWhere,
  switchType,
  tryRemove,
} from "@/wab/common";
import { removeFromArray } from "@/wab/commons/collections";
import { resolveAllTokenRefs } from "@/wab/commons/StyleToken";
import { hasImageAssetRef } from "@/wab/image-assets";
import {
  IChangeRecorder,
  ModelChange,
  RecordedChanges,
} from "@/wab/observable-model";
import {
  removeMarkersToTpl,
  replaceTplTreeByEmptyBox,
  tplChildren,
  trackComponentRoot,
  trackComponentSite,
  tryGetTplOwnerComponent,
} from "@/wab/tpls";
import { undoChanges } from "@/wab/undo-util";
import { uniq } from "lodash";
import { getArenaFrames } from "./Arenas";
import { instUtil } from "./core/InstUtil";
import {
  isBaseVariant,
  isScreenVariantGroup,
  tryGetBaseVariantSetting,
} from "./Variants";

export interface DeletedAssetsSummary {
  deletedComponents: Component[];
  deletedImageAssets: ImageAsset[];
  deletedMixins: Mixin[];
  deletedTokens: StyleToken[];
  deletedParams: Param[];
  deletedVariantGroups: VariantGroup[];
  deletedVariants: Variant[];
  deletedVars: Var[];
  deletedStates: State[];
  deletedTplNodes: TplNode[];
  deletedComponentDataQueries: ComponentDataQuery[];
  deletedThemes: Theme[];
  deletedArgTypes: ArgType[];
  deletedExprs: Expr[];
}

export function getEmptyDeletedAssetsSummary(): DeletedAssetsSummary {
  return {
    deletedComponents: [],
    deletedImageAssets: [],
    deletedMixins: [],
    deletedParams: [],
    deletedTokens: [],
    deletedVariantGroups: [],
    deletedVariants: [],
    deletedVars: [],
    deletedStates: [],
    deletedTplNodes: [],
    deletedComponentDataQueries: [],
    deletedThemes: [],
    deletedArgTypes: [],
    deletedExprs: [],
  };
}

export function updateSummaryFromDeletedInstances(
  summary: DeletedAssetsSummary,
  insts: ObjInst[],
  opts?: {
    includeTplNodesAndExprs?: boolean;
  }
) {
  insts.forEach((inst) => {
    if (isKnownComponent(inst)) {
      summary.deletedComponents.push(inst);
    } else if (isKnownImageAsset(inst)) {
      summary.deletedImageAssets.push(inst);
    } else if (isKnownMixin(inst)) {
      summary.deletedMixins.push(inst);
    } else if (isKnownStyleToken(inst)) {
      summary.deletedTokens.push(inst);
    } else if (isKnownParam(inst)) {
      summary.deletedParams.push(inst);
    } else if (isKnownVariantGroup(inst)) {
      summary.deletedVariantGroups.push(inst);
    } else if (isKnownVariant(inst)) {
      summary.deletedVariants.push(inst);
    } else if (isKnownVar(inst)) {
      summary.deletedVars.push(inst);
    } else if (isKnownState(inst)) {
      summary.deletedStates.push(inst);
    } else if (isKnownComponentDataQuery(inst)) {
      summary.deletedComponentDataQueries.push(inst);
    } else if (isKnownTheme(inst)) {
      summary.deletedThemes.push(inst);
    } else if (isKnownArgType(inst)) {
      summary.deletedArgTypes.push(inst);
    } else if (opts?.includeTplNodesAndExprs && isKnownTplNode(inst)) {
      // We don't always include tpl nodes as it could affect multiplayer
      // performance and the only possible conflicts are really hard to happen, e.g.
      // deleting a tpl node at the same time someone else creates a private style
      // variant for that node. For branching however, it gets more likely to happen
      summary.deletedTplNodes.push(inst);
    } else if (opts?.includeTplNodesAndExprs && isKnownExpr(inst)) {
      summary.deletedExprs.push(inst);
    }
  });
  return summary;
}

function cloneDeletedAssetsSummary(
  summary: DeletedAssetsSummary
): DeletedAssetsSummary {
  return {
    deletedComponents: [...summary.deletedComponents],
    deletedImageAssets: [...summary.deletedImageAssets],
    deletedMixins: [...summary.deletedMixins],
    deletedParams: [...summary.deletedParams],
    deletedTokens: [...summary.deletedTokens],
    deletedVariantGroups: [...summary.deletedVariantGroups],
    deletedVariants: [...summary.deletedVariants],
    deletedVars: [...summary.deletedVars],
    deletedStates: [...summary.deletedStates],
    deletedTplNodes: [...summary.deletedTplNodes],
    deletedComponentDataQueries: [...summary.deletedComponentDataQueries],
    deletedThemes: [...summary.deletedThemes],
    deletedArgTypes: [...summary.deletedArgTypes],
    deletedExprs: [...summary.deletedExprs],
  };
}

class UnresolvedConflictError extends CustomError {
  name: "UnresolvedConflictError";
  constructor(message: string) {
    debugger;
    super(message);
  }
}

// Here we will try to undo `changes`, while being aware of changes that
// came from the server when someone else edited the project (in
// `serverSummary`). The main problems come from deleted instances, as they
// might be referenced by other instances.
// For deletion we need to make sure we deal with both directions: (1) the
// local changes create an instance that has been deleted on the server and (2)
// the local changes try to delete an instance that got a new reference from the
// server. To solve both cases together, we use a merged summary of deleted
// instances from the server (`serverSummary`) with the instances that we're
// about to delete (from `recorder.getToBeDeletedInsts`): for each instance,
// we look for leaking references to them, so they can be fixed and the
// invariants preserved.
// We run this function when (1) re-applying local changes after "rebasing" the
// site from the server; and (2) when applying old changes from the undo log
// (undoing or redoing).
export function undoChangesAndResolveConflicts(
  site: Site,
  recorder: IChangeRecorder,
  serverSummary: DeletedAssetsSummary,
  changes: ModelChange[]
): RecordedChanges {
  return recorder.withRecording(() => {
    undoChanges(changes);

    const toBeDeleted = recorder.getToBeDeletedInsts();
    const isInstDeleted = (inst: ObjInst) =>
      toBeDeleted.has(inst) || !recorder.getAnyPathToChild(inst);

    // Fix reparenting conflicts
    recorder.getChangesSoFar().forEach((change) => {
      if (
        change.type === "update" &&
        isKnownTplNode(change.changeNode.inst) &&
        (!change.path || change.changeNode.field === "parent")
      ) {
        const child = change.changeNode.inst;
        const oldParent = change.oldValue;
        const newParent = child.parent;
        if (
          isKnownTplNode(oldParent) &&
          oldParent !== newParent &&
          tplChildren(oldParent).includes(child) &&
          !isInstDeleted(child) &&
          !isInstDeleted(oldParent)
        ) {
          // Two parents pointing to the same child instance should happen only
          // if both parents are in the same tplTree (otherwise we make a copy
          // of the child before moving to another tree, so we could just end up
          // with two different copies to the child in that case).
          child.parent = oldParent;
          deleteParentRefsToTpl(child);
          child.parent = newParent;
        }
      }
    });

    fixDanglingReferenceConflicts(site, recorder, serverSummary);
  });
}

const deleteParentRefsToTpl = (childToDelete: TplNode) => {
  switchType(childToDelete.parent)
    .when(TplTag, (tpl) =>
      removeWhere(tpl.children, (child) => child === childToDelete)
    )
    .when(TplSlot, (tpl) =>
      removeWhere(tpl.defaultContents, (child) => child === childToDelete)
    )
    .when(TplComponent, (tpl) =>
      [...(tryGetBaseVariantSetting(tpl)?.args ?? [])].forEach(
        (arg) =>
          isKnownRenderExpr(arg.expr) &&
          removeWhere(arg.expr.tpl, (child) => child === childToDelete)
      )
    )
    .when(null, () => {})
    .result();
};

export function fixDanglingReferenceConflicts(
  site: Site,
  recorder: IChangeRecorder,
  deletedSummary: DeletedAssetsSummary
) {
  let hasMoreInstancesToBeDeleted: boolean;
  let currentIteraction = 0;
  const maxIteractions = 50;
  do {
    currentIteraction++;
    assert(currentIteraction < maxIteractions, () => `Infinite loop!`);
    hasMoreInstancesToBeDeleted = false;
    const toBeDeleted = mergeSets(
      recorder.getToBeDeletedInsts(),
      recorder.getDeletedInstsWithDanglingRefs()
    );
    const summary = updateSummaryFromDeletedInstances(
      cloneDeletedAssetsSummary(deletedSummary),
      [...toBeDeleted.keys()],
      {
        includeTplNodesAndExprs: true,
      }
    );

    // Make sure the component roots are up-to-date after all changes
    site.components.forEach((component) => {
      trackComponentRoot(component);
      trackComponentSite(component, site);
    });

    const unexpectedRef = (inst: ObjInst, ref: ObjInst) => {
      throw new UnresolvedConflictError(
        `Unexpected instance ${instUtil.getInstClassName(
          inst
        )} to be referenced by ${instUtil.getInstClassName(ref)}`
      );
    };

    // The instance might have been added again while undoing the changes, so
    // we should double check
    const isInstDeleted = (inst: ObjInst) =>
      toBeDeleted.has(inst) || !recorder.getAnyPathToChild(inst);

    // Deletes `Expr`s containing WeakRefs
    const deleteExpr = (
      expr:
        | ImageAssetRef
        | TplRef
        | VarRef
        | StyleTokenRef
        | PageHref
        | FunctionArg
        | StrongFunctionArg
        | FunctionExpr
    ) =>
      recorder.getRefsToInst(expr).forEach((ref) =>
        switchType(ref)
          .when(VariantSetting, (vs) => {
            for (const prop of [...Object.keys(vs.attrs)]) {
              if (vs.attrs[prop] === expr) {
                delete vs.attrs[prop];
              }
            }
          })
          .when(Arg, (arg) => {
            if (arg.expr === expr) {
              recorder.getRefsToInst(arg).forEach((argRef) =>
                switchType(argRef)
                  .when(VariantSetting, (vs) => tryRemove(vs.args, arg))
                  .elseUnsafe(() => unexpectedRef(arg, argRef))
              );
            }
          })
          .when(Param, (param) => {
            if (param.defaultExpr === expr) {
              param.defaultExpr = null;
            }
            if (param.previewExpr === expr) {
              param.previewExpr = null;
            }
          })
          .when([CustomCode, ObjectPath], (parentExpr) => {
            if (parentExpr.fallback === expr) {
              parentExpr.fallback = null;
            }
          })
          .when(PageHref, (href) => {
            const key = ensure(
              Object.keys(href.params).find((k) => href.params[k] === expr),
              () => `Expected to find param referencing the expression`
            );
            delete href.params[key];
          })
          .when(FunctionArg, (functionArg) => deleteExpr(functionArg))
          .when(CollectionExpr, (collectionExpr) => {
            collectionExpr.exprs = collectionExpr.exprs.map((childExpr) =>
              childExpr === expr ? null : childExpr
            );
          })
          .when(MapExpr, (mapExpr) => {
            const key = ensure(
              Object.keys(mapExpr.mapExpr).find(
                (k) => mapExpr.mapExpr[k] === expr
              ),
              () => `Expected to find expression reference`
            );
            delete mapExpr.mapExpr[key];
          })
          .when(FunctionExpr, (functionExpr) => deleteExpr(functionExpr))
          .when(CompositeExpr, (compositeExpr) => {
            const key = ensure(
              Object.keys(compositeExpr.substitutions).find(
                (k) => compositeExpr.substitutions[k] === expr
              ),
              () => `Expected to find substitution referencing the expression`
            );
            delete compositeExpr.substitutions[key];
          })
          .when(NameArg, (nameArg) => {
            if (nameArg.expr === expr) {
              recorder.getRefsToInst(nameArg).forEach((argRef) =>
                switchType(argRef)
                  .when(Interaction, (i) => tryRemove(i.args, nameArg))
                  .elseUnsafe(() => unexpectedRef(nameArg, argRef))
              );
            }
          })
          .elseUnsafe(() => unexpectedRef(expr, ref))
      );

    const deleteState = (state: State) =>
      recorder
        .getRefsToInst(state)
        .filter((inst) => !isInstDeleted(inst))
        .forEach((ref) =>
          switchType(ref)
            .when(Component, (stateComp) => {
              removeWhere(stateComp.states, (state2) => state2 === state);
            })
            .when(State, (state2) => deleteState(state2))
            .when(ComponentVariantGroup, (vg) => {
              const component = ensure(
                recorder.getRefsToInst(vg, false).find(isKnownComponent),
                () =>
                  `No component found for VariantGroup ${vg.param.variable.name}`
              );
              removeWhere(component.variantGroups, (group) => group === vg);
            })
            .when(Param, (param) => {
              const component = ensure(
                recorder.getRefsToInst(param, false).find(isKnownComponent),
                () => `No component found for Param ${param.variable.name}`
              );
              removeWhere(component.params, (p) => p === param);
            })
            .elseUnsafe(() => unexpectedRef(state, ref))
        );

    const deleteSplitContent = (content: SplitContent) =>
      recorder
        .getRefsToInst(content)
        .filter((inst) => !isInstDeleted(inst))
        .forEach((ref) =>
          switchType(ref)
            .when(SplitSlice, (slice) => {
              const previousLength = slice.contents.length;
              removeWhere(slice.contents, (content2) => content2 === content);
              if (previousLength === 0 || slice.contents.length > 0) {
                return;
              }
              recorder.getRefsToInst(content).forEach((sliceRef) =>
                switchType(sliceRef)
                  .when(Split, (split) => {
                    removeWhere(split.slices, (slice2) => slice2 === slice);
                    if (split.slices.length <= 1) {
                      // We rely on each split having at least two slices
                      removeWhere(site.splits, (split2) => split2 === split);
                    }
                  })
                  .elseUnsafe(() => unexpectedRef(slice, sliceRef))
              );
            })
            .elseUnsafe(() => unexpectedRef(content, ref))
        );

    summary.deletedComponents.filter(isInstDeleted).forEach((c) => {
      let needsToRemoveFrames = false;

      // Fix all other references to the component
      const refs = recorder
        .getRefsToInst(c)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((componentRef) =>
        switchType(componentRef)
          .when(TplComponent, (tplComponent) => {
            if (
              recorder
                .getRefsToInst(tplComponent)
                .some((ref) => isKnownArenaFrame(ref))
            ) {
              needsToRemoveFrames = true;
            } else {
              const maybeOwner = recorder
                .getRefsToInst(tplComponent)
                .filter((inst) => !isInstDeleted(inst))
                .find(
                  (owner): owner is Component =>
                    isKnownComponent(owner) && owner.tplTree === tplComponent
                );
              if (maybeOwner) {
                replaceTplTreeByEmptyBox(maybeOwner);
              } else {
                deleteParentRefsToTpl(tplComponent);
                tplComponent.parent = null;
              }
            }
          })
          .when([ComponentArena, PageArena], () => {
            needsToRemoveFrames = true;
          })
          .when(ComponentInstance, (instanceType) => {
            // ComponentInstances are always referenced by slot types
            recorder.getRefsToInst(instanceType).forEach((ref) =>
              switchType(ref)
                .when(RenderableType, (renderable) =>
                  removeWhere(
                    renderable.params,
                    (param) => param === instanceType
                  )
                )
                .when(RenderFuncType, (renderable) =>
                  removeWhere(
                    renderable.allowed,
                    (param) => param === instanceType
                  )
                )
                .elseUnsafe(() => unexpectedRef(instanceType, ref))
            );
          })
          .when(PageHref, (expr) => deleteExpr(expr))
          .when(Site, (s) => {
            if (s.pageWrapper === c) {
              s.pageWrapper = null;
            }
            [...Object.keys(s.defaultComponents)].forEach((key) => {
              if (s.defaultComponents[key] === c) {
                delete s.defaultComponents[key];
              }
            });
          })
          .when(Component, (c2) => {
            if (c2.superComp === c) {
              c2.superComp = null;
            }
            removeWhere(c2.subComps, (sub) => sub === c);
          })
          .when(State, (state) => deleteState(state))
          .when(SplitContent, (content) => deleteSplitContent(content))
          .elseUnsafe(() => unexpectedRef(c, componentRef))
      );

      if (needsToRemoveFrames) {
        for (const arena of site.arenas) {
          for (const frame of [...getArenaFrames(arena)]) {
            if (frame.container.component === c) {
              removeFromArray(arena.children, frame);
            }
          }
        }
        removeWhere(site.componentArenas, (it) => it.component === c);
        removeWhere(site.pageArenas, (it) => it.component === c);
      }
    });
    summary.deletedImageAssets.filter(isInstDeleted).forEach((asset) => {
      const refs = recorder
        .getRefsToInst(asset)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((assetRef) =>
        switchType(assetRef)
          .when(PageMeta, (meta) => (meta.openGraphImage = null))
          .when(ImageAssetRef, (expr) => deleteExpr(expr))
          .when(RuleSet, (rs) => {
            // Delete all the rs.values that references deleted asset
            for (const key of Object.keys(rs.values)) {
              const val = rs.values[key];
              if (hasImageAssetRef(val, asset)) {
                delete rs.values[key];
              }
            }
          })
          .elseUnsafe(() => unexpectedRef(asset, assetRef))
      );
    });
    summary.deletedMixins.filter(isInstDeleted).forEach((mixin) => {
      const refs = recorder
        .getRefsToInst(mixin)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((ref) =>
        switchType(ref)
          .when(RuleSet, (rs) => removeWhere(rs.mixins, (m) => m === mixin))
          .elseUnsafe(() => unexpectedRef(mixin, ref))
      );
    });
    summary.deletedParams.filter(isInstDeleted).forEach((param) => {
      const refs = recorder
        .getRefsToInst(param)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((ref) => {
        switchType(ref)
          .when(Component, (c) => removeWhere(c.params, (p) => p === param))
          .when(TplSlot, (tplSlot) => {
            deleteParentRefsToTpl(tplSlot);
          })
          .when(Arg, (arg) => {
            const vs = ensure(
              recorder.getRefsToInst(arg).filter(isKnownVariantSetting)[0],
              () => `No VariantSetting found for arg ${arg.param.variable.name}`
            );
            removeWhere(vs.args, (a) => a === arg);
          })
          .when(ComponentVariantGroup, (vg) => {
            const component = ensure(
              recorder.getRefsToInst(vg).find(isKnownComponent),
              () =>
                `No component found for VariantGroup ${vg.param.variable.name}`
            );
            removeWhere(component.variantGroups, (group) => group === vg);
          })
          .when(State, (state) => {
            const component = ensure(
              recorder.getRefsToInst(state).filter(isKnownComponent)[0],
              () => `No component found for State ${state.param.variable.name}`
            );
            removeWhere(component.states, (s) => state === s);
          })
          .elseUnsafe(() => unexpectedRef(param, ref));
      });
    });
    summary.deletedTokens.filter(isInstDeleted).forEach((token) => {
      const refs = recorder
        .getRefsToInst(token)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((ref) =>
        switchType(ref)
          .when(RuleSet, (rs) => {
            for (const key of Object.keys(rs.values)) {
              const val = rs.values[key];
              // replace the token refs with token value
              rs.values[key] = resolveAllTokenRefs(
                val,
                summary.deletedTokens.filter(isInstDeleted)
              );
            }
          })
          .when([StyleToken, VariantedValue], (t) => {
            t.value = resolveAllTokenRefs(
              t.value,
              summary.deletedTokens.filter(isInstDeleted)
            );
          })
          .when(StyleTokenRef, (t) => deleteExpr(t))
          .elseUnsafe(() => unexpectedRef(token, ref))
      );
    });
    summary.deletedVars.filter(isInstDeleted).forEach((variable) => {
      const refs = recorder
        .getRefsToInst(variable)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((r) => {
        switchType(r)
          .when(VarRef, (varRef) => deleteExpr(varRef))
          .elseUnsafe(() => unexpectedRef(variable, r));
      });
    });
    summary.deletedVariantGroups.filter(isInstDeleted).forEach((vg) => {
      const refs = recorder
        .getRefsToInst(vg)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((vgRef) =>
        switchType(vgRef)
          .when(ArenaFrameRow, (row) => {
            recorder.getRefsToInst(row).forEach((ref) =>
              switchType(ref)
                .when(ArenaFrameGrid, (grid) =>
                  removeWhere(grid.rows, (r) => r === row)
                )
                .elseUnsafe(() => unexpectedRef(row, ref))
            );
          })
          .when(Site, (s) => {
            assert(
              s.activeScreenVariantGroup === vg,
              () =>
                `Expected Site to reference VariantGroup through activeScreenVariantGroup`
            );
            s.activeScreenVariantGroup = s.globalVariantGroups.find((group) =>
              isScreenVariantGroup(group)
            );
          })
          .when(SplitContent, (content) => deleteSplitContent(content))
          .when(State, (state) => deleteState(state))
          .elseUnsafe(() => unexpectedRef(vg, vgRef))
      );
    });
    summary.deletedVariants.filter(isInstDeleted).forEach((variant) => {
      const refs = recorder
        .getRefsToInst(variant)
        .filter((inst) => !isInstDeleted(inst));

      refs.forEach((variantRef) =>
        switchType(variantRef)
          .when(ArenaFrameRow, (row) => {
            recorder.getRefsToInst(row).forEach((ref) =>
              switchType(ref)
                .when(ArenaFrameGrid, (grid) =>
                  removeWhere(grid.rows, (r) => r === row)
                )
                .elseUnsafe(() => unexpectedRef(row, ref))
            );
          })
          .when(ArenaFrameCell, (cell) => {
            recorder.getRefsToInst(cell).forEach((ref) =>
              switchType(ref)
                .when(ArenaFrameRow, (row) =>
                  removeWhere(row.cols, (c) => c === cell)
                )
                .elseUnsafe(() => unexpectedRef(cell, ref))
            );
          })
          .when(ArenaFrame, (frame) => {
            removeWhere(frame.targetVariants, (v) => v === variant);
            removeWhere(frame.targetGlobalVariants, (v) => v === variant);
            if (variant.uuid in frame.pinnedVariants) {
              delete frame.pinnedVariants[variant.uuid];
            }
            if (variant.uuid in frame.pinnedGlobalVariants) {
              delete frame.pinnedGlobalVariants[variant.uuid];
            }
          })
          .when(
            ColumnsSetting,
            (settings) => (settings.screenBreakpoint = null)
          )
          .when(VariantSetting, (vs) => {
            recorder
              .getRefsToInst(vs)
              .filter((inst) => !isInstDeleted(inst))
              .forEach((vsRef) =>
                switchType(vsRef)
                  .when(TplNode, (tpl) => {
                    if (!variant.parent) {
                      const ownerComponent = tryGetTplOwnerComponent(tpl);
                      if (ownerComponent) {
                        const newVariant = ownerComponent.variants.find(
                          (v) =>
                            isBaseVariant(variant) === isBaseVariant(v) &&
                            v.forTpl == variant.forTpl &&
                            (v.selectors == variant.selectors ||
                              (Array.isArray(v.selectors) &&
                                Array.isArray(variant.selectors) &&
                                arrayEqIgnoreOrder(
                                  v.selectors,
                                  variant.selectors
                                )))
                        );
                        if (newVariant) {
                          // The variant was replaced with another one -
                          // possibly was deduplicated when both branches
                          // created style variants for the same selector
                          vs.variants = uniq(
                            vs.variants.map((v) =>
                              v === variant ? newVariant : v
                            )
                          );
                          return;
                        }
                      }
                    }
                    removeWhere(tpl.vsettings, (vs2) => vs2 === vs);
                  })
                  .elseUnsafe(() => unexpectedRef(vs, vsRef))
              );
          })
          .when(VariantsRef, (expr) =>
            removeWhere(expr.variants, (v) => v === variant)
          )
          .when(VariantedValue, (variantedValue) =>
            recorder.getRefsToInst(variantedValue).forEach((ref) =>
              switchType(ref)
                .when(StyleToken, (token) =>
                  removeWhere(token.variantedValues, (val) =>
                    val.variants.includes(variant)
                  )
                )
                .elseUnsafe(() => unexpectedRef(variantedValue, ref))
            )
          )
          .when(VariantedRuleSet, (variantedRS) =>
            recorder.getRefsToInst(variantedRS).forEach((ref) =>
              switchType(ref)
                .when(Mixin, (mixin) =>
                  removeWhere(mixin.variantedRs, (val) =>
                    val.variants.includes(variant)
                  )
                )
                .elseUnsafe(() => unexpectedRef(variantedRS, ref))
            )
          )
          .when(SplitContent, (content) => deleteSplitContent(content))
          .elseUnsafe(() => unexpectedRef(variant, variantRef))
      );
    });
    summary.deletedStates.filter(isInstDeleted).forEach((state) => {
      const refs = recorder
        .getRefsToInst(state)
        .filter((inst) => !isInstDeleted(inst));
      if (refs.length > 0) {
        deleteState(state);
      }
    });
    summary.deletedTplNodes.filter(isInstDeleted).forEach((tpl) => {
      const refs = recorder
        .getRefsToInst(tpl)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((tplRef) =>
        switchType(tplRef)
          .when(Variant, (v) => {
            assert(
              v.forTpl === tpl,
              () =>
                `Expected variant to weakly reference TplNode through 'forTpl' field`
            );
            site.components.forEach((c) =>
              removeWhere(c.variants, (v2) => v2 === v)
            );
          })
          .when(SlotParam, (slotParam) => {
            const component = ensure(
              recorder.getRefsToInst(slotParam, false).find(isKnownComponent),
              () =>
                `No component found for slot param ${slotParam.variable.name}`
            );
            removeWhere(component.params, (p) => p === slotParam);
          })
          .when(State, (state) => deleteState(state))
          .when(TplRef, (expr) => deleteExpr(expr))
          .when(NodeMarker, (marker) => {
            recorder
              .getRefsToInst(marker)
              .filter((markerRef) => !isInstDeleted(markerRef))
              .forEach((markerRef) =>
                switchType(markerRef)
                  .when(RawText, (text) => removeMarkersToTpl(text, tpl))
                  .elseUnsafe(() => unexpectedRef(marker, markerRef))
              );
          })
          .when(QueryRef, (q) => {
            recorder.getRefsToInst(q).forEach((ref) =>
              switchType(ref)
                .when(DataSourceOpExpr, (dataSourceOpExpr) => {
                  if (dataSourceOpExpr.parent === q) {
                    dataSourceOpExpr.parent = null;
                  }
                })
                .when(QueryInvalidationExpr, (queryInvalidationExpr) => {
                  queryInvalidationExpr.invalidationQueries =
                    queryInvalidationExpr.invalidationQueries.filter(
                      (invalidationQuery) => invalidationQuery !== q
                    );
                })
                .elseUnsafe(() => unexpectedRef(q, ref))
            );
          })
          .elseUnsafe(() => unexpectedRef(tpl, tplRef))
      );
    });
    summary.deletedComponentDataQueries
      .filter(isInstDeleted)
      .forEach((query) => {
        const refs = recorder
          .getRefsToInst(query)
          .filter((inst) => !isInstDeleted(inst));
        refs.forEach((queryRef) =>
          switchType(queryRef)
            .when(QueryRef, (q) => {
              recorder.getRefsToInst(q).forEach((ref) =>
                switchType(ref)
                  .when(DataSourceOpExpr, (dataSourceOpExpr) => {
                    if (dataSourceOpExpr.parent === q) {
                      dataSourceOpExpr.parent = null;
                    }
                  })
                  .when(QueryInvalidationExpr, (queryInvalidationExpr) => {
                    queryInvalidationExpr.invalidationQueries =
                      queryInvalidationExpr.invalidationQueries.filter(
                        (invalidationQuery) => invalidationQuery !== q
                      );
                  })
                  .elseUnsafe(() => unexpectedRef(q, ref))
              );
            })
            .elseUnsafe(() => unexpectedRef(query, queryRef))
        );
      });
    summary.deletedThemes.filter(isInstDeleted).forEach((theme) => {
      const refs = recorder
        .getRefsToInst(theme)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((themeRef) =>
        switchType(themeRef)
          .when(Site, (s) => {
            if (s.activeTheme === theme) {
              s.activeTheme = s.themes[0] ?? null;
            }
          })
          .elseUnsafe(() => unexpectedRef(theme, themeRef))
      );
    });
    summary.deletedArgTypes.filter(isInstDeleted).forEach((argType) => {
      const refs = recorder
        .getRefsToInst(argType)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((ref) =>
        switchType(ref)
          .when([FunctionArg, StrongFunctionArg], (expr) => deleteExpr(expr))
          .elseUnsafe(() => unexpectedRef(argType, ref))
      );
    });
    summary.deletedExprs.filter(isInstDeleted).forEach((expr) => {
      const refs = recorder
        .getRefsToInst(expr)
        .filter((inst) => !isInstDeleted(inst));
      refs.forEach((ref) =>
        switchType(ref)
          .when(Interaction, (i) => {
            if (i.parent === expr) {
              const actualParent = ensureKnownEventHandler(
                only(
                  recorder
                    .getRefsToInst(i, false)
                    .filter((inst) => !isInstDeleted(inst))
                )
              );
              i.parent = actualParent;
            }
          })
          .elseUnsafe(() => unexpectedRef(expr, ref))
      );
    });
    const nextToBeDeleted = mergeSets(
      recorder.getToBeDeletedInsts(),
      recorder.getDeletedInstsWithDanglingRefs()
    );
    hasMoreInstancesToBeDeleted = Array.from(nextToBeDeleted.keys()).some(
      (inst) => !toBeDeleted.has(inst)
    );
  } while (hasMoreInstancesToBeDeleted);
}
