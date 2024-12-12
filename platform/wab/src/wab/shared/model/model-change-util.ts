import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { arrayReversed } from "@/wab/commons/collections";
import {
  componentToTplComponents,
  deepComponentToReferencers,
  extractComponentVariantSettings,
  extractImageAssetRefsByAttrs,
} from "@/wab/shared/cached-selectors";
import {
  ensure,
  ensureArrayOfInstances,
  tuple,
  TypeStamped,
  xDifference,
} from "@/wab/shared/common";
import { allComponentVariants } from "@/wab/shared/core/components";
import {
  ChangeNode,
  mkArrayBeforeSplice,
  ModelChange,
  RecordedChanges,
} from "@/wab/shared/core/observable-model";
import {
  ALWAYS_RESOLVE_MIXIN_PROPS,
  plasmicImgAttrStyles,
  SIZE_PROPS,
} from "@/wab/shared/core/style-props";
import { createRuleSetMerger } from "@/wab/shared/core/styles";
import {
  findVariantSettingsUnderTpl,
  flattenTpls,
  isComponentRoot,
  isTplColumns,
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import { PLASMIC_DISPLAY_NONE } from "@/wab/shared/css";
import { getEffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { makeExpFromValues } from "@/wab/shared/exprs";
import { isFlexContainerWithGap } from "@/wab/shared/layoututils";
import {
  Component,
  isKnownColumnsConfig,
  isKnownComponent,
  isKnownImageAsset,
  isKnownMixin,
  isKnownProjectDependency,
  isKnownRuleSet,
  isKnownSite,
  isKnownStyleToken,
  isKnownTheme,
  isKnownThemeStyle,
  isKnownTplNode,
  isKnownVariant,
  isKnownVariantedRuleSet,
  isKnownVariantedValue,
  isKnownVariantGroup,
  isKnownVariantSetting,
  Mixin,
  ProjectDependency,
  RuleSet,
  Site,
  ThemeLayoutSettings,
  TplComponent,
  TplNode,
  Variant,
  VariantGroup,
  VariantSetting,
} from "@/wab/shared/model/classes";
import {
  ReadonlyIRuleSetHelpersX,
  RuleSetHelpers,
} from "@/wab/shared/RuleSetHelpers";
import { hasSpecialSizeVal } from "@/wab/shared/sizingutils";
import { $$$ } from "@/wab/shared/TplQuery";
import { isAncestorCombo } from "@/wab/shared/variant-sort";
import {
  getStyleOrCodeComponentVariantIdentifierName,
  isGlobalVariant,
  isGlobalVariantGroup,
  isStyleOrCodeComponentVariant,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import L, { omit } from "lodash";

export enum ChangesType {
  NoChange,
  CssOnly,
  OtherChanges,
}

// How were style tokens or Mixin's or ImageAsset are changed. Values are ordered by
// precedence.
export enum CssVarsChangeType {
  // No change
  None,
  // Mixin.Preview/Mixin.Name/ImageAsset.name was updated.
  // No CSS update is required.
  ChangedButNoFixNeeded,
  // The value of a token or asset or an existing property of mixin was
  // updated. This require just updating the cssVars rule.
  CssVarsOnly,
  // rule was added/removed to/from existing Mixin. This requires updating
  // the cssVars rule, and all rules that reference the Mixin.
  MixinRulesSpliced,
  // site.activeTheme was changed to a different theme
  ActiveThemeChanged,
}

/**
 * Summary of `ModelChange`s, in terms of higher-level concepts like TplNodes.
 */
export interface ChangeSummary {
  // Set of new TplNode trees that have been attached to the model tree.
  // Note that these are _trees_; if the root of a tree is in this set,
  // then its children may not be here.
  newTrees: Set<TplNode>;

  // Set of existing TplNode trees with a field that has been updated;
  // this is either by setting a field value directly, or modifying an
  // array field value or object field value.
  updatedNodes: Set<TplNode>;

  // Set of Components that have been updated.
  updatedComponents: Set<Component>;

  // Set of Components that deeply reference components that have been updated
  deepUpdatedComponents: Set<Component>;

  // VariantSettings and TplNodes, whose RuleSets have changed and the
  // corresponding css class definitions need to be updated.
  //
  // Also includes nodes whose width/height are set to a special value
  // ("auto", "stretch", "wrap") and whose css needs to be updated because what
  // those special value meant has changed.  These changes come from these
  // sources:
  // 1. width/height props themselves have changed
  // 2. the node has been moved to a different parent
  // 3. parent containerType has changed (horizontal stack vs vertical, etc)
  // 4. TplComponent with "auto" width/height has its Component root size
  //    changed
  // 5. TplComponent with "auto" width/height changed to a different variant
  //    (which may have different default width/height)
  // Also includes options to update extra VariantSettings. If
  // `updateDependentVSs`, all rulesets whose EffectiveVariantSettings might
  // might also be affected should regenerate styles. If `updateChildren` is
  // true, the children of `tpl` should also regenerate their styles.
  updatedRuleSets: Map<
    VariantSetting,
    {
      tpl: TplNode;
      updateDependentVSs?: boolean;
      updateChildren?: boolean;
    }
  >;

  // True if only css-related changes are observed. This is limited to setting
  // RuleSet rules, and Variant.selectors.
  changesType: ChangesType;

  // Some existing TplNode has had its RuleSet changed in a way that requires
  // a re-eval / re-render
  styleForcesEval: boolean;

  // How were style tokens or Mixin's are changed.
  tokenOrMixinChangeType: CssVarsChangeType;

  // A set of VariantSetting removed by the change.
  deletedVariantSettings: Map<VariantSetting, TplNode>;

  // A map with Mixins whose referencing rules will all need to be re-generated.
  // This includes Mixins whosse rules have been spliced and mixins
  // whose "ALWAYS_RESOLVE_MIXIN_PROPS" have changed.
  // It maps to options indicating whether rules that inherit from that ones
  // should also be regenerated (for example, if we change flex-gap on base,
  // we might need to update other variants as well, since we use the Effective
  // Variant Setting for those rules). If updateTplChildren is `true`, the
  // children of such nodes should also regenerate their styles
  regenMixins: Map<
    Mixin,
    { updateDependentVSs?: boolean; updateTplChildren?: boolean }
  >;

  // A set of Components whose style rules need to be re-ordered, because its
  // variants or variant groups have been reordered, or a global variant group
  // that it uses has been reordered
  rulesReorderedComponents: Set<Component>;

  // ProjectDependency changes
  updatedDeps: Set<ProjectDependency>;
  deletedDeps: Set<ProjectDependency>;

  changes: ModelChange[];
}

function isParentPointerChange(change: ModelChange) {
  const last = change.changeNode;
  return isKnownTplNode(last.inst) && last.field === "parent";
}

/**
 * Given a list of `ModelChange`s, returns a `ChangeSummary`.
 */
export function summarizeChanges(
  studioCtx: StudioCtx,
  recordedData: RecordedChanges
): ChangeSummary {
  // We ignore changes to the parent pointer, as they always manifest
  // as some other change anyway (for example, changes to the children)
  // field of some other node
  const changes = recordedData.changes.filter((c) => !isParentPointerChange(c));

  const site = studioCtx.site;
  const updatedNodes = new Set<TplNode>();
  const updatedComponents = new Set<Component>();
  const updatedRuleSets = new Map<
    VariantSetting,
    {
      tpl: TplNode;
      updateDependentVSs?: boolean;
      updateChildren?: boolean;
    }
  >();
  const deletedVariantSettings = new Map<VariantSetting, TplNode>();
  const updatedDeps = new Set<ProjectDependency>();
  const deletedDeps = new Set<ProjectDependency>();
  const regenMixins = new Map<
    Mixin,
    { updateDependentVSs?: boolean; updateTplChildren?: boolean }
  >();
  const tplMgr = studioCtx.tplMgr();
  let styleForcesEval = false;
  let changesType =
    changes.length > 0 ? ChangesType.CssOnly : ChangesType.NoChange;
  let tokenOrMixinChangeType = CssVarsChangeType.None;

  const handleNewValue = (change: ModelChange, value: any) => {
    if (isKnownProjectDependency(value)) {
      // We don't need to react to adding or removing project deps,
      // as they are static.
      updatedDeps.add(value);
      return;
    } else if (isKnownVariantSetting(value)) {
      const tpl = getChangedTplNode(change);
      if (tpl) {
        maybeMergeMap(updatedRuleSets, value, { tpl });
      }
    }
  };

  const handleOldValue = (value: any) => {
    if (isKnownProjectDependency(value)) {
      // We don't need to react to adding or removing project deps,
      // as they are static.
      deletedDeps.add(value);
      return;
    }
  };

  // Handle new / removed trees
  const newTrees = new Set<TplNode>(
    recordedData.newInsts.filter(isKnownTplNode)
  );
  const removedTrees = new Set<TplNode>(
    recordedData.removedInsts.filter(isKnownTplNode)
  );

  [...newTrees.keys()].forEach((tpl) => {
    if (
      $$$(tpl)
        .parents()
        .toArrayOfTplNodes()
        .some((anc) => newTrees.has(anc))
    ) {
      // Make sure no subtree includes another
      newTrees.delete(tpl);
    }
    if (!tplMgr.isOwnedBySite(tpl)) {
      // We also don't include frame roots
      newTrees.delete(tpl);
    }
  });
  newTrees.forEach((tree) => {
    for (const [vs, tpl] of findVariantSettingsUnderTpl(tree)) {
      maybeMergeMap(updatedRuleSets, vs, { tpl });
    }
  });
  [...removedTrees.keys()].forEach((tpl) => {
    if (!tplMgr.isOwnedBySite(tpl)) {
      removedTrees.delete(tpl);
    }
  });

  for (const change of changes) {
    if (change.type === "array-splice") {
      change.added.forEach((v) => handleNewValue(change, v));
      change.removed.forEach((v) => handleOldValue(v));
    } else if (change.type === "obj-add") {
      handleNewValue(change, change.newValue);
    } else if (change.type === "obj-delete") {
      handleOldValue(change.oldValue);
    } else {
      if (L.isArray(change.newValue) && L.isArray(change.oldValue)) {
        // Updated the array object itself, instead of array-splice
        const added = [...xDifference(change.newValue, change.oldValue).keys()];
        const removed = [
          ...xDifference(change.oldValue, change.newValue).keys(),
        ];
        added.forEach((v) => handleNewValue(change, v));
        removed.forEach((v) => handleOldValue(v));
      } else {
        handleNewValue(change, change.newValue);
        handleOldValue(change.oldValue);
      }
    }

    const changedRs = getChangedRuleSet(change);
    if (changedRs) {
      maybeMergeMap(updatedRuleSets, changedRs[0], {
        tpl: changedRs[1] as TplNode,
      });
    }

    const changedRsByVariantSelectors = getChangedRuleSetsByVariantSelectors(
      studioCtx,
      change
    );
    if (changedRsByVariantSelectors) {
      for (const [vs, tpl] of changedRsByVariantSelectors) {
        maybeMergeMap(updatedRuleSets, vs, { tpl: tpl as TplNode });
      }
    }

    maybeAdd(updatedNodes, getChangedTplNode(change));
    maybeAdd(updatedComponents, getChangedComponent(change));

    const flexToggled = getChangedRuleSetsByFlexGapToggle(change);
    if (flexToggled && flexToggled.type === "tpl") {
      flexToggled.updates.forEach(([vs, node]) =>
        maybeMergeMap(updatedRuleSets, vs, { tpl: node })
      );
    }

    const flexUpdate = getChangedRuleSetsByFlexGapUpdate(change);
    if (flexUpdate) {
      // If we've updated flex gap, we need to update the styles for all
      // children nodes
      if (flexUpdate.type === "tpl") {
        maybeMergeMap(updatedRuleSets, flexUpdate?.vs, {
          tpl: flexUpdate?.tpl,
          updateChildren: true,
          // If we are updating the gaps in a responsive columns
          // we have to update the dependent vs, because they have
          // their widths calculated based in this gap
          updateDependentVSs: isTplColumns(flexUpdate.tpl),
        });
      } else {
        maybeMergeMap(regenMixins, flexUpdate.mixin, {
          updateTplChildren: true,
        });
      }
    }

    const marginUpdate = getChangedRuleSetsByMarginAndVisibilityUpdate(change);
    if (marginUpdate) {
      // If we've updated margin-left or margin-right ()
      if (marginUpdate.type === "tpl") {
        maybeMergeMap(updatedRuleSets, marginUpdate?.vs, {
          tpl: marginUpdate?.tpl,
          updateDependentVSs: true,
        });
      } else {
        maybeMergeMap(regenMixins, marginUpdate.mixin, {
          updateDependentVSs: true,
        });
      }
    }

    const responsiveColumnsUpdate = getChangedResponsiveColumnsUpdate(change);
    if (responsiveColumnsUpdate) {
      maybeMergeMap(updatedRuleSets, responsiveColumnsUpdate.vs, {
        tpl: responsiveColumnsUpdate.tpl,
        // We need to update dependent vs because they can have a different
        // gap prop, so when calculating their sizes we different widths
        updateDependentVSs: true,
      });
    }

    styleForcesEval =
      styleForcesEval ||
      !!flexToggled ||
      changeTogglesTplSlotStyles(change) ||
      changeChangesImgSize(change);

    const [thisTokenOrMixinValueChangeType, splicedMixin] =
      getCssVarsChangeType(change);
    maybeMergeMap(regenMixins, splicedMixin, {});
    maybeMergeMap(
      regenMixins,
      getMixinWithChangedAlwaysResolveProps(change),
      {}
    );

    const tagChanged = changedRs && changedRs[2];
    if (
      tagChanged ||
      (!changedRs &&
        !changedRsByVariantSelectors &&
        thisTokenOrMixinValueChangeType == CssVarsChangeType.None)
    ) {
      changesType = ChangesType.OtherChanges;
    }

    tokenOrMixinChangeType = Math.max(
      tokenOrMixinChangeType,
      thisTokenOrMixinValueChangeType
    );
    getDeletedVariantSettings(change).forEach(([vs, tpl]) =>
      deletedVariantSettings.set(vs, tpl)
    );
  }

  const changedComponentsByImageAsset = new Set<Component>();
  for (const change of changes) {
    const changedComponents = getChangedComponentsByImageAsset(
      studioCtx,
      change
    );
    if (changedComponents) {
      changedComponents.forEach((c) => changedComponentsByImageAsset.add(c));
      styleForcesEval = true;
    }
  }

  const globalContextChanged = changes.some(
    (change) =>
      change.path &&
      change.path.length > 0 &&
      change.path[0].field === "globalContexts"
  );

  // If the globalContexts changed, it's easier to update
  // everything to rerender. It shouldn't be something that
  // changes a lot.
  const deepUpdatedComponents = globalContextChanged
    ? new Set(site.components)
    : getDeeplyChangedComponent(
        studioCtx,
        changes,
        changedComponentsByImageAsset
      );

  getChangedRuleSetsByMasterComponentRootSizeChange(studioCtx, changes).forEach(
    ([vs, node]) => maybeMergeMap(updatedRuleSets, vs, { tpl: node })
  );
  getChangedRuleSetsByActiveVariants(studioCtx, changes).forEach(([vs, node]) =>
    maybeMergeMap(updatedRuleSets, vs, { tpl: node })
  );

  // Remove variantsettings owned by removed tplNodes.
  removedTrees.forEach((tree) =>
    flattenTpls(tree).forEach((removed) => {
      if (isTplVariantable(removed)) {
        removed.vsettings.forEach((vs) =>
          deletedVariantSettings.set(vs, removed)
        );
      }
      // If a node had been updated and then removed, then just
      // exlude it from updatedNodes
      if (updatedNodes.has(removed)) {
        updatedNodes.delete(removed);
      }
    })
  );
  // Remove deleted rulesets from update sets.
  deletedVariantSettings.forEach((tpl, vs) => updatedRuleSets.delete(vs));

  return {
    newTrees,
    updatedNodes,
    updatedComponents,
    deepUpdatedComponents,
    updatedRuleSets,
    styleForcesEval,
    changesType,
    tokenOrMixinChangeType,
    regenMixins,
    deletedVariantSettings,
    updatedDeps,
    deletedDeps,
    rulesReorderedComponents: getReorderedRulesComponents(site, changes),
    changes,
  };
}

export function getChangedTplNode(change: ModelChange) {
  const found = extractAlongPath(change.path, [TplNode]);
  return found ? (found[0] as TplNode) : undefined;
}

/**
 * If this is a change that is downstream of a RuleSet (adding / editing Rules,
 * etc), then returns the owning VariantSetting, its owning TplNode and if
 * the tag changed.
 */
function getChangedRuleSet(
  change: ModelChange
): [VariantSetting, TplNode, boolean] | undefined {
  if (!change.path) {
    return undefined;
  }

  const path = change.path;
  const last = change.changeNode;

  const found = extractAlongPath(path, [RuleSet, VariantSetting, TplNode]);
  if (found) {
    return tuple(found[1], found[2], false);
  }

  if (isTplTag(last.inst) && last.field === "tag") {
    // Changing tag also results in css style changes.  We only need to update
    // the base variant setting, as that's where default styles for each tag
    // go.
    return tuple(
      ensure(
        tryGetBaseVariantSetting(last.inst),
        () => "Expected base variantSetting to exist"
      ),
      last.inst,
      true
    );
  }

  return undefined;
}

/**
 * Returns RuleSets and TplComponents whose css should be re-generated because
 * their width/height are set to "default" and the size of the master component
 * has changed.
 */
function getChangedRuleSetsByMasterComponentRootSizeChange(
  studioCtx: StudioCtx,
  changes: ModelChange[]
): [VariantSetting, TplComponent][] {
  const affectedComponents = new Set<Component>();
  for (const change of changes) {
    if (changeTogglesSize(change)) {
      const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
      if (vsTpl) {
        const [_vs, tpl] = vsTpl;
        if (isComponentRoot(tpl)) {
          const component = $$$(tpl).tryGetOwningComponent();
          if (component) {
            affectedComponents.add(component);
          }
          // If there's no owning component, that means this tpl had been detached
        }
      }
    }
  }

  if (affectedComponents.size === 0) {
    return [];
  }

  return L.flatten(
    Array.from(affectedComponents).map((component) =>
      getAffectedComponentInstancesWithDefaultSize(studioCtx.site, component)
    )
  );
}

/**
 * When the default size of `component` changes, gathers all instances who are
 * using default sizes, and thus have changed their sizes as well.  Note that since
 * a TplComponent can be a root node of another Component, if that TplComponent's size
 * has changed, then instances of _that_ Component's sizes may also change, so this
 * chases all of them down recursively.
 */
function getAffectedComponentInstancesWithDefaultSize(
  site: Site,
  component: Component
) {
  const changes: [VariantSetting, TplComponent][] = [];

  const seenComps = new Set<Component>();

  const updateForComp = (comp: Component) => {
    if (seenComps.has(comp)) {
      return;
    }
    for (const inst of componentToTplComponents(site, comp)) {
      let changed = false;
      for (const vs of inst.vsettings) {
        if (hasSpecialSizeVal(inst, vs)) {
          // We can probably be cleverer here and check if the root size change
          // corresponds to the variant that's active on this TplComponent,
          // but it's cheap to re-generate the style anyway.
          changes.push(tuple(vs, inst));
          changed = true;
        }
      }

      if (changed && isComponentRoot(inst)) {
        // If this instance size has been affected, but it is also the root
        // of a Component, then other instances of _that_ Component with
        // width/height set to default will also be affected, so include
        // those for the update as well
        const instComp = $$$(inst).tryGetOwningComponent();
        if (instComp) {
          updateForComp(instComp);
        }
      }
    }
  };

  updateForComp(component);
  return changes;
}

/**
 * Returns RuleSets and TplComponents whose css should be re-generated because
 * their active variants have changed, and the corresponding width/height are
 * set to "auto", so we need to re-generate the css with the root width/height
 * of the component for that variant
 */
function getChangedRuleSetsByActiveVariants(
  studioCtx: StudioCtx,
  changes: ModelChange[]
): [VariantSetting, TplComponent][] {
  const updates: [VariantSetting, TplComponent][] = [];
  const affectedComponents = new Set<Component>();

  for (const change of changes) {
    const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
    if (vsTpl) {
      const [vs, tpl] = vsTpl;
      if (isTplComponent(tpl)) {
        // Check if the args of the vs has changed
        if (
          change.path &&
          change.path.some((p) => p.inst === vs && p.field === "args")
        ) {
          if (hasSpecialSizeVal(tpl, vs)) {
            updates.push(tuple(vs, tpl));
            if (isComponentRoot(tpl)) {
              // If this happens to be a root node of a Component, then all
              // instances of _that_ Component will also need to be re-sized.
              const component = $$$(tpl).tryGetOwningComponent();
              if (component) {
                affectedComponents.add(component);
              }
            }
          }
        }
      }
    }
  }

  return [
    ...updates,
    ...L.flatten(
      Array.from(affectedComponents).map((component) =>
        getAffectedComponentInstancesWithDefaultSize(studioCtx.site, component)
      )
    ),
  ];
}

/**
 * Returns true if the change changes the width or height in any way
 */
function changeTogglesSize(change: ModelChange) {
  return changeTogglesStyle(change, SIZE_PROPS, (vals) =>
    styleTypeFromProps(vals, SIZE_PROPS)
  );
}

function getDeletedVariantSettings(
  change: ModelChange
): Array<[VariantSetting, TplNode]> {
  if (change.type !== "array-splice") {
    return [];
  }

  const last = change.changeNode;
  if (last.field !== "vsettings") {
    return [];
  }

  const tpl = getChangedTplNode(change);
  return tpl
    ? ensureArrayOfInstances(change.removed, VariantSetting)
        .filter(
          (vs) =>
            // The sets of deleted and added nodes in an "array-splice" change
            // might overlap
            !change.added.includes(vs)
        )
        .map((vs) => tuple(vs, tpl))
    : [];
}

function changeTogglesTplSlotStyles(change: ModelChange) {
  // If we change styles on a TplSlot, then we need to force an eval.  That's because
  // the corresponding TplSlot class name is only applied if the vsetting is not empty;
  // so if we are going from empty to not empty, we need to re-evaluate to apply
  // the class.  We do this because of some crazy stuff we need to do to make sure
  // styled slots work when you nest TplSlots -- passing a styled TplSlot as a prop
  // arg to another styled TplSlot.  See eval.ts, extractUnstyledPlainText for more.
  const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
  return !!vsTpl && isTplSlot(vsTpl[1]);
}

function changeChangesImgSize(change: ModelChange) {
  // If an img's width/height changes, then we need to pass new values
  // into `<PlasmicImg/>` displayWidth/Height, which requires an
  // evaluation
  const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
  if (vsTpl) {
    const [_vs, tpl] = vsTpl;
    if (isTplTag(tpl) && tpl.tag === "img") {
      return changeTogglesStyle(change, plasmicImgAttrStyles, (vals) =>
        styleTypeFromProps(vals, plasmicImgAttrStyles)
      );
    }
  }
  return false;
}

/**
 * If this is a change on Variant.selectors, then we need to regenerate the css rule
 * for all VariantSettings that reference this variant
 */
function getChangedRuleSetsByVariantSelectors(
  studioCtx: StudioCtx,
  change: ModelChange
): [VariantSetting, TplNode][] | undefined {
  const last = change.changeNode;

  if (!isKnownVariant(last.inst)) {
    return undefined;
  } else if (!isStyleOrCodeComponentVariant(last.inst)) {
    return undefined;
  } else if (
    last.field !== getStyleOrCodeComponentVariantIdentifierName(last.inst)
  ) {
    return undefined;
  } else {
    const variant = last.inst;
    const component = getChangedComponent(change);
    if (component) {
      return extractComponentVariantSettings(
        studioCtx.site,
        component,
        false
      ).filter(([vs, _tpl]) => vs.variants.includes(variant));
    }
    return undefined;
  }
}

/**
 * If an ImageAsset's dataUri has changed, then any component that
 * references that ImageAsset via an img TplTag's src attr, or svg
 * TplTag's outerHTML attr, will need to be re-evaluated.
 */
function getChangedComponentsByImageAsset(
  studioCtx: StudioCtx,
  change: ModelChange
) {
  const last = change.changeNode;
  if (isKnownImageAsset(last.inst) && last.field === "dataUri") {
    // Get everything that reference this asset
    const updates = new Set<Component>();
    for (const component of studioCtx.site.components) {
      if (
        extractImageAssetRefsByAttrs(studioCtx.site, component).has(last.inst)
      ) {
        updates.add(component);
      }
    }
    return updates;
  }
  return undefined;
}

function getCssVarsChangeType(
  change: ModelChange
): [CssVarsChangeType, Mixin?] {
  const last = change.changeNode;
  if (isKnownSite(last.inst) && last.field === "styleTokens") {
    // insert or delete a token
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (isKnownSite(last.inst) && last.field === "mixins") {
    // insert or delete a mixin
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (isKnownSite(last.inst) && last.field === "imageAssets") {
    // insert or delete a image asset
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (isKnownSite(last.inst) && last.field === "activeTheme") {
    return [CssVarsChangeType.ActiveThemeChanged, undefined];
  }
  if (isKnownStyleToken(last.inst)) {
    if (
      last.field === "value" ||
      last.field === "variantedValues" ||
      last.field === "name"
    ) {
      // value or name of style token changed (changing the name requires
      // updating the external CSS var)
      return [CssVarsChangeType.CssVarsOnly, undefined];
    }
    return [CssVarsChangeType.ChangedButNoFixNeeded, undefined];
  }
  if (isKnownVariantedValue(last.inst)) {
    // insert, delete or update a token variant
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (isKnownImageAsset(last.inst)) {
    if (last.field === "dataUri") {
      // value of style token changed
      return [CssVarsChangeType.CssVarsOnly, undefined];
    }
    return [CssVarsChangeType.ChangedButNoFixNeeded, undefined];
  }
  if (isKnownMixin(last.inst)) {
    if (last.field === "variantedRs") {
      // insert/deleted varianted rules into Mixin.
      return [CssVarsChangeType.MixinRulesSpliced, last.inst];
    }
    // metadata changed on Mixin, such as name and preview
    return [CssVarsChangeType.ChangedButNoFixNeeded, undefined];
  }
  if (isKnownVariantedRuleSet(last.inst)) {
    // insert, delete or update a mixin variant
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (
    isKnownRuleSet(last.inst) &&
    last.field === "values" &&
    change.type === "obj-update" &&
    extractAlongPath(change.path, [RuleSet, Mixin])
  ) {
    // The values of a Mixin's existing rule is changed, i.e. either
    // updated, inserted, or removed. This require update the CssVarsOnly.
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (isKnownRuleSet(last.inst) && last.field === "values") {
    const found = extractAlongPath(change.path, [RuleSet, Mixin]);
    if (found) {
      // insert/deleted a rule into Mixin, or setting all rules at once.
      // Requires updating the Mixin itself, and all rules referring this Mixin.
      return [CssVarsChangeType.MixinRulesSpliced, found[1]];
    }
  }
  if (
    isKnownTheme(last.inst) &&
    last.field === "styles" &&
    change.type === "array-splice" &&
    isKnownThemeStyle(change.added[0])
  ) {
    // Added new tag styles to theme.
    return [CssVarsChangeType.MixinRulesSpliced, change.added[0].style];
  }
  if (
    (isKnownSite(last.inst) && last.field === "themes") ||
    isKnownTheme(last.inst)
  ) {
    // Theme added/removed, or activation changed. Just update CssVars only.
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  if (extractAlongPath(change.path, [ThemeLayoutSettings])) {
    return [CssVarsChangeType.CssVarsOnly, undefined];
  }
  return [CssVarsChangeType.None, undefined];
}

export function getChangedComponent(change: ModelChange) {
  const found = extractAlongPath(change.path, [Component]);
  return found ? found[0] : undefined;
}

function getDeeplyChangedComponent(
  studioCtx: StudioCtx,
  changes: ModelChange[],
  seedComponents: Set<Component>
) {
  const changed = new Set<Component>(seedComponents);

  const updateForPath = (path: ChangeNode[]) => {
    for (const node of path) {
      if (isKnownComponent(node.inst)) {
        changed.add(node.inst);
      }
    }
  };

  // First, gather all the directly changed Components
  for (const change of changes) {
    if (change.path) {
      updateForPath(change.path);
    }
  }

  if (changed.size === 0) {
    return changed;
  }

  // Next, gather up all components that deeply reference the changed components
  const deepCompToReferencers = deepComponentToReferencers(studioCtx.site);
  const seedChanged = [...changed];
  const deepChanged = new Set([
    ...seedChanged,
    ...seedChanged.flatMap((comp) => [
      // if comp had been deleted from site, it's possible for deepCompToReferencers
      // to remove undefined
      ...(deepCompToReferencers.get(comp) ?? []),
    ]),
  ]);
  return deepChanged;
}

/**
 * Returns rulesets that should be regenerated because flex gap has been
 * toggled.
 */
function getChangedRuleSetsByFlexGapToggle(change: ModelChange) {
  const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
  if (vsTpl) {
    const [vs, tpl] = vsTpl;
    if (isTplVariantable(tpl)) {
      const exp = getEffectiveVariantSetting(tpl as TplNode, vs.variants).rsh();
      if (changeTogglesFlexGap(change, exp)) {
        // We re-generate the css for all VariantSettings for this tpl.  That's
        // because toggling flex gap may make a different for other variants as well;
        // if you toggle the flex gap for the base variant, then other variants that
        // inherit that gap will also need to generate the right css for the flex
        // container, especially if those other variants also have flex-related
        // settings like justify-content.  We just re-generate css for all VSs
        // for now instead of figuring out exactly which VS may be impacted.
        return {
          type: "tpl",
          updates: tpl.vsettings.map((vs2) => tuple(vs2, tpl)),
        } as const;
      }
    }
  }

  const rsMixin = extractAlongPath(change.path, [RuleSet, Mixin]);
  if (rsMixin) {
    const exp = new RuleSetHelpers(rsMixin[0], "div");
    if (changeTogglesFlexGap(change, exp)) {
      return {
        type: "mixin",
        mixin: rsMixin[1],
      } as const;
    }
  }

  return undefined;
}

/**
 * Returns rulesets that should be regenerated because flex gap has been
 * updated.
 */
function getChangedRuleSetsByFlexGapUpdate(change: ModelChange) {
  const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
  if (vsTpl) {
    const [vs, tpl] = vsTpl;
    if (isTplVariantable(tpl) && changeUpdatesFlexGap(change)) {
      return {
        type: "tpl",
        tpl,
        vs,
      } as const;
    }
  }

  const rsMixin = extractAlongPath(change.path, [RuleSet, Mixin]);
  if (rsMixin && changeUpdatesFlexGap(change)) {
    return {
      type: "mixin",
      mixin: rsMixin[1],
    } as const;
  }

  return undefined;
}

/**
 * Returns rulesets that should be regenerated because the margin has changed
 * and it depends on the gap from the parent, or visibility has changed.
 */
function getChangedRuleSetsByMarginAndVisibilityUpdate(change: ModelChange) {
  const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
  if (vsTpl) {
    const [vs, tpl] = vsTpl;
    if (isTplVariantable(tpl)) {
      if (
        isTplVariantable(tpl.parent) &&
        changeUpdatesDependentMargin(
          change,
          // Only need to include ancestor combos as only those might be
          // in the EffectiveVariantSettings
          createRuleSetMerger(
            tpl.parent.vsettings
              .filter((it) => isAncestorCombo(vs.variants, it.variants))
              .map((it) => it.rs),
            tpl.parent
          )
        )
      ) {
        return {
          type: "tpl",
          tpl,
          vs,
        } as const;
      }

      if (changeTogglesVisibility(change)) {
        return {
          type: "tpl",
          tpl,
          vs,
        } as const;
      }
    }
  }

  const rsMixin = extractAlongPath(change.path, [RuleSet, Mixin]);
  if (
    rsMixin &&
    (changeUpdatesDependentMargin(change) || changeTogglesVisibility(change))
  ) {
    return {
      type: "mixin",
      mixin: rsMixin[1],
    } as const;
  }

  return undefined;
}

function isResponsiveColumnsChange(change: ModelChange) {
  return isKnownColumnsConfig(change.changeNode.inst);
}

function getChangedResponsiveColumnsUpdate(change: ModelChange) {
  const vsTpl = extractAlongPath(change.path, [VariantSetting, TplNode]);
  if (vsTpl) {
    const [vs, tpl] = vsTpl;
    if (isTplColumns(tpl) && isResponsiveColumnsChange(change)) {
      return {
        type: "tpl",
        tpl,
        vs,
      } as const;
    }
  }
  return undefined;
}

/**
 * Returns a Mixin if one of its props that should always be resolved has
 * been updated.
 */
function getMixinWithChangedAlwaysResolveProps(change: ModelChange) {
  const rsMixin = extractAlongPath(change.path, [RuleSet, Mixin]);
  if (rsMixin) {
    const [_rs, mixin] = rsMixin;
    if (
      changeTogglesStyle(change, ALWAYS_RESOLVE_MIXIN_PROPS, (values) =>
        styleTypeFromProps(values, ALWAYS_RESOLVE_MIXIN_PROPS)
      )
    ) {
      return mixin;
    }
  }
  return undefined;
}

/**
 * Returns true if this `change` toggles flex column/row gap from none to some.
 *
 * We care about this because flex-column-gap and flex-row-gap are "fake" css
 * styles that we implement ourselves by rendering extra elements in the
 * val-renderer.
 */
function changeTogglesFlexGap(
  change: ModelChange,
  exp: ReadonlyIRuleSetHelpersX
) {
  return changeTogglesStyle(
    change,
    ["display", "flex-column-gap", "flex-row-gap"],
    (values) => {
      const checkExp = makeExpFromValues(values);
      const hasGap = isFlexContainerWithGap(checkExp);
      return hasGap ? "gap" : "none";
    }
  );
}

/**
 * Return true if this `change` toggles visibility
 */
function changeTogglesVisibility(change: ModelChange) {
  return changeTogglesStyle(
    change,
    [PLASMIC_DISPLAY_NONE, "display"],
    (values) => {
      return styleTypeFromProps(values, [PLASMIC_DISPLAY_NONE, "display"]);
    }
  );
}

/**
 * Returns true if this `change` changes flex gap in any way.
 *
 * We care about it because the flex gap is used by all children nodes
 */
function changeUpdatesFlexGap(change: ModelChange) {
  return changeTogglesStyle(
    change,
    ["flex-column-gap", "flex-row-gap"],
    (values) => {
      return styleTypeFromProps(values, ["flex-column-gap", "flex-row-gap"]);
    }
  );
}

/**
 * Returns true if this `change` changes a margin that might affect other nodes
 * (due to flex gaps).
 *
 * If we change margin-top, for example, and if we have a row gap on the parent,
 * all variants that inherit the margin will gerenate a new margin taking the
 * gap into consideration.
 */
function changeUpdatesDependentMargin(
  change: ModelChange,
  parentExp?: ReadonlyIRuleSetHelpersX
) {
  return changeTogglesStyle(change, ["margin-left", "margin-top"], (values) => {
    let types: string[] | undefined = undefined;
    if (!parentExp || parentExp.has("flex-column-gap")) {
      if ("margin-left" in values) {
        types = ensurePush(types, `margin-left-${values["margin-left"]}`);
      }
    }
    if (!parentExp || parentExp.has("flex-row-gap")) {
      if ("margin-top" in values) {
        types = ensurePush(types, `margin-top-${values["margin-top"]}`);
      }
    }
    return types?.join("");
  });
}

function styleTypeFromProps(values: Record<string, string>, props: string[]) {
  let types: string[] | undefined = undefined;
  for (const prop of props) {
    if (prop in values) {
      types = ensurePush(types, `${prop}-${values[prop]}`);
    }
  }
  return types?.join("");
}

function ensurePush(vals: string[] | undefined, value: string) {
  if (!vals) {
    vals = [value];
  } else {
    vals.push(value);
  }
  return vals;
}

function changeTogglesStyle(
  change: ModelChange,
  relevantProps: string[],
  getRuleType: (values: Record<string, string>) => string | undefined
) {
  const last = change.changeNode;
  if (isKnownRuleSet(last.inst) && last.field === "values") {
    if (change.type === "obj-add") {
      // Adding a new css prop
      const prop = change.key as string;
      if (relevantProps.includes(prop)) {
        const oldValues = omit(change.object, prop);
        return getRuleType(oldValues) !== getRuleType(change.object);
      }
      return false;
    } else if (change.type === "obj-update") {
      // Updating a css prop
      const prop = change.key as string;
      if (relevantProps.includes(prop)) {
        const oldValues = { ...change.object, ...{ [prop]: change.oldValue } };
        return getRuleType(oldValues) !== getRuleType(change.object);
      }
      return false;
    } else if (change.type === "obj-delete") {
      // Deleting a css prop
      const prop = change.key as string;
      const oldValues = { ...change.object, [prop]: change.oldValue };
      return getRuleType(oldValues) !== getRuleType(change.object);
    } else if (change.type === "update") {
      // Directly setting RuleSet.values
      return getRuleType(change.oldValue) !== getRuleType(change.newValue);
    } else {
      throw new Error(`Unexpected change type ${change.type}`);
    }
  } else if (isKnownRuleSet(last.inst) && last.field === "mixins") {
    const mixinsToRules = (mixins: Mixin[]): Record<string, string> =>
      Object.assign({}, ...mixins.map((m) => m.rs.values));
    // Update to RuleSet.mixins
    if (change.type === "array-splice") {
      // Updating the members of RuleSet.mixins.
      return (
        getRuleType(
          mixinsToRules(mkArrayBeforeSplice(last.inst.mixins, change))
        ) !== getRuleType(mixinsToRules(last.inst.mixins))
      );
    } else if (change.type === "array-update") {
      // Setting RuleSet.mixins[i] directly
      return (
        getRuleType((change.oldValue as Mixin).rs.values) !==
        getRuleType((change.newValue as Mixin).rs.values)
      );
    } else if (change.type === "update") {
      // Setting RuleSet.mixins directly
      return (
        getRuleType(mixinsToRules(change.oldValue as Mixin[])) !==
        getRuleType(mixinsToRules(change.newValue as Mixin[]))
      );
    }
  }
  return false;
}

/**
 * When variants or variant groups are re-ordered, we need to reorder
 * the css rules to preserve the precedence ordering of variants.
 */
function getReorderedRulesComponents(site: Site, changes: ModelChange[]) {
  const addedVariants = new Set<Variant>();
  const removedVariants = new Set<Variant>();
  const movedVariants = new Set<Variant>();
  const addedGroups = new Set<VariantGroup>();
  const removedGroups = new Set<VariantGroup>();
  const movedGroups = new Set<VariantGroup>();
  for (const change of changes) {
    const { inst, field } = change.changeNode;
    if (isKnownSite(inst) && field === "activeScreenVariantGroup") {
      // If activeScreenVariantGroup was changed, then we know we'll
      // need to update everything!
      return new Set(site.components);
    } else if (isKnownVariant(inst) && field === "mediaQuery") {
      // When the mediaQuery of a screen variant changes, we simulate
      // a re-ordering, as it's possible the ordered set of screen
      // variants has changed
      movedVariants.add(inst);
    } else if (change.type === "array-splice") {
      if (isKnownVariantGroup(inst) && field === "variants") {
        change.added.forEach((v) => addedVariants.add(v));
        change.removed.forEach((v) => removedVariants.add(v));
      } else if (isKnownComponent(inst) && field === "variantGroups") {
        change.added.forEach((g) => addedGroups.add(g));
        change.removed.forEach((g) => removedGroups.add(g));
      }
    }
  }

  for (const variant of addedVariants) {
    if (removedVariants.has(variant)) {
      movedVariants.add(variant);
    }
  }

  for (const group of addedGroups) {
    if (removedGroups.has(group)) {
      movedGroups.add(group);
    }
  }

  const reorderedComponents = new Set<Component>();

  if (movedVariants.size > 0) {
    const variantToComp = new Map(
      site.components.flatMap((comp) =>
        allComponentVariants(comp).map((v) => tuple(v, comp))
      )
    );
    for (const variant of movedVariants) {
      if (isGlobalVariant(variant)) {
        // TODO: do better than all components
        site.components.forEach((c) => reorderedComponents.add(c));
      } else if (variantToComp.has(variant)) {
        reorderedComponents.add(
          ensure(
            variantToComp.get(variant),
            () =>
              `Expected owner component to exist for variant ${variant.name} (${variant.uuid})`
          )
        );
      }
    }
  }

  if (movedGroups.size > 0) {
    for (const group of movedGroups) {
      if (isGlobalVariantGroup(group)) {
        // TODO: do better than all components
        site.components.forEach((c) => reorderedComponents.add(c));
      } else {
        const comp = site.components.find((c) =>
          c.variantGroups.includes(group)
        );
        if (comp) {
          reorderedComponents.add(comp);
        }
      }
    }
  }

  return reorderedComponents;
}

function extractAlongPath<T>(
  path: ChangeNode[] | undefined,
  cls: [TypeStamped<T>]
): [T] | undefined;
function extractAlongPath<T1, T2>(
  path: ChangeNode[] | undefined,
  cls: [TypeStamped<T1>, TypeStamped<T2>]
): [T1, T2] | undefined;
function extractAlongPath<T1, T2, T3>(
  path: ChangeNode[] | undefined,
  cls: [TypeStamped<T1>, TypeStamped<T2>, TypeStamped<T3>]
): [T1, T2, T3] | undefined;
/**
 * Given a path, extracts items along the path that are instances of classes in
 * `cls`. The order of `cls` is from the end of the path to the beginning of
 * the path.
 */
function extractAlongPath(
  path: ChangeNode[] | undefined,
  cls: TypeStamped<any>[]
) {
  if (!path) {
    return undefined;
  }
  let curIndex = 0;
  const found: any[] = [];
  for (const n of arrayReversed(path)) {
    if (cls[curIndex].isKnown(n.inst)) {
      found.push(n.inst);
      curIndex += 1;
    }

    if (curIndex === cls.length) {
      return found;
    }
  }
  return undefined;
}

function maybeAdd<T>(set: Set<T>, item: T | undefined) {
  if (item) {
    set.add(item);
  }
}

function maybeMergeMap<T, V>(map: Map<T, V>, item: T | undefined, val: V) {
  if (item) {
    map.set(item, { ...(map.get(item) ?? {}), ...val });
  }
}
