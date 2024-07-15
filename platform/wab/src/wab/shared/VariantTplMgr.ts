import { arrayReversed, removeFromArray } from "@/wab/commons/collections";
import { ReplaceKey } from "@/wab/commons/types";
import {
  computedProjectFlags,
  findNonEmptyCombos,
} from "@/wab/shared/cached-selectors";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  arrayEqIgnoreOrder,
  assert,
  check,
  ensure,
  ensureArray,
  last,
  swallow,
} from "@/wab/shared/common";
import {
  ComponentVariantFrame,
  GlobalVariantFrame,
  TransientComponentVariantFrame,
} from "@/wab/shared/component-frame";
import {
  allComponentVariants,
  getComponentDisplayName,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { asCode } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { getTagAttrForImageAsset } from "@/wab/shared/core/image-assets";
import {
  allGlobalVariants,
  isFrameRootTplComponent,
} from "@/wab/shared/core/sites";
import { getAllDefinedStyles } from "@/wab/shared/core/style-props";
import {
  AttrsSpec,
  ChildSet,
  flattenTplsWithoutVirtualDescendants,
  getTplOwnerComponent,
  isTplColumn,
  isTplColumns,
  isTplContainer,
  isTplVariantable,
  mkSlot,
  MkTplComponentParams,
  mkTplComponentX,
  MkTplTagOpts,
  mkTplTagX,
  summarizeTpl,
  TplTagType,
} from "@/wab/shared/core/tpls";
import { PLASMIC_DISPLAY_NONE } from "@/wab/shared/css";
import {
  ArgSource,
  computeDefinedIndicator,
  DefinedIndicatorType,
} from "@/wab/shared/defined-indicator";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  adaptEffectiveVariantSetting,
  EffectiveVariantSetting,
} from "@/wab/shared/effective-variant-setting";
import { CanvasEnv, tryEvalExpr } from "@/wab/shared/eval";
import { ensureComponentsObserved } from "@/wab/shared/mobx-util";
import {
  Arg,
  Component,
  Expr,
  ImageAsset,
  ImageAssetRef,
  isKnownTplNode,
  isKnownTplSlot,
  isKnownVariantsRef,
  Mixin,
  Param,
  RawText,
  Site,
  SlotParam,
  TplComponent,
  TplNode,
  Var,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { getAncestorTplSlot, isSlotVar } from "@/wab/shared/SlotUtils";
import { ensureBaseVariant, TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  isAncestorScreenVariant,
  makeVariantComboSorter,
  sortedVariantSettingStack,
} from "@/wab/shared/variant-sort";
import {
  addingBaseToTplWithExistingBase,
  ensureBaseRuleVariantSetting,
  ensureValidCombo,
  getBaseVariant,
  getImplicitlyActivatedStyleVariants,
  isBaseVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isStandaloneVariantGroup,
  mkVariantSetting,
  tryGetVariantSetting,
  VariantCombo,
} from "@/wab/shared/Variants";
import {
  getTplVisibilityAsDescendant,
  isInvisible,
  isMaybeVisible,
  setTplVisibility,
  TplVisibility,
} from "@/wab/shared/visibility-utils";
import L from "lodash";

type StylePropOpts = { forVisibility?: boolean };

/**
 * Tpl tree utility operations for making edits specific to the current
 * variants
 * expressed in the ComponentStackFrame.
 *
 * As of today, stack has at least one frame -- that of of the root
 * ArenaFrame.container. Subsequent optional frames are whatever tpl-component
 * we are spotlighting in ComponentCtx.  When there's only one frame, any tpl
 * within the root component, plus ArenaFrame.container itself, are valid to be
 * passed in as arguments to methods.  When there are additional frames, then
 * any tpl within the spotlight component, plus the TplComponent that we are
 * spotlighting, are valid arguments.
 */
export class VariantTplMgr {
  constructor(
    private stack: ComponentVariantFrame[],
    private site: Site,
    private tplMgr: TplMgr,
    private globalFrame: GlobalVariantFrame,
    private getCanvasEnvForTpl?: (node: TplNode) => CanvasEnv | undefined
  ) {}

  ensureBaseVariantSetting(tpl: TplNode) {
    const variant = this.getBaseVariantForNode(tpl);
    const vs = tpl.vsettings.find((_vs) => isBaseVariant(_vs.variants));
    if (vs) {
      return vs;
    }

    const baseVs = mkVariantSetting({ variants: [variant] });
    assert(
      !addingBaseToTplWithExistingBase(tpl, variant),
      "Trying to add base vs to tpl with existing base vs"
    );
    tpl.vsettings.push(baseVs);

    return baseVs;
  }

  tryGetBaseVariantSetting(tpl: TplNode) {
    const variant = this.getBaseVariantForNode(tpl);
    check(isBaseVariant(variant));
    return tpl.vsettings.find((v) => isBaseVariant(v.variants));
  }

  private getBaseVariantForNode(tpl: TplNode) {
    const variant = this.tplMgr.tryGetBaseVariantForNode(tpl);
    if (variant) {
      return variant;
    } else {
      // This node is not yet attached
      return this.getBaseVariantForNewNode();
    }
  }

  getOwningComponentForNewNode() {
    // We assume it belongs to the component at the top of the frame
    const frame = ensure(L.last(this.stack), "Stack must have a valid frame");
    return frame.component;
  }

  getBaseVariantForNewNode() {
    return this.tplMgr.ensureBaseVariant(this.getOwningComponentForNewNode());
  }

  private getOwningComponent(tpl: TplNode) {
    const component = $$$(tpl).tryGetOwningComponent();
    if (component) {
      return component;
    }
    if (isFrameRootTplComponent(this.site, tpl)) {
      return undefined;
    } else {
      return ensure(L.last(this.stack), "Stack must have a valid frame")
        .component;
    }
  }

  private getVariantsForNode(tpl: TplNode) {
    const component = this.getOwningComponent(tpl);
    if (!component) {
      return [this.site.globalVariant];
    }
    return allComponentVariants(component, { includeSuperVariants: true });
  }

  /**
   * Returns the current VariantCombo in the current editing context
   * @param opts.includePrivate if true, will also include private style variant
   *   if tpl matches the current private node.  Else only includes component-level
   *   variants.
   * @parma opts.ignoreSlotDefaultContent by default, slot default contents
   *   can only target the base variant, so will always return the base variant.
   *   If true, then ignores this check and returns the current selected variants.
   *   Really only makes sense when computing indicators.
   * @param opts.forVisibility by default, if tpl is only visible for a specific
   *   variant, then we'll actually return the base variant as the target.
   *   But this wouldn't work if you are trying to toggle visibility! So if
   *   forVisibility is true, then we return the usual set of target variants.
   */
  private _getTargetVariantComboForNode(
    tpl: TplNode,
    opts: {
      includePrivate: boolean;
      ignoreSlotDefaultContent: boolean;
    } & StylePropOpts
  ) {
    const frame = this.getContainingFrame(tpl);
    if (!frame) {
      return [this.site.globalVariant];
    }
    if (!opts.ignoreSlotDefaultContent && getAncestorTplSlot(tpl, true)) {
      // slot default content always target only the base variant
      return [this.getBaseVariantForNode(tpl)];
    }
    const currentCombo = this.getVariantComboForStackFrame(frame).filter(
      (v) => {
        if (isPrivateStyleVariant(v)) {
          // Only include private style variants if explicitly told to
          return opts.includePrivate && v.forTpl === tpl;
        } else {
          return true;
        }
      }
    );

    const isOnlyVisibleOnCurrentCombo = () => {
      if (isInvisible(getTplVisibilityAsDescendant(tpl, currentCombo))) {
        // not even visible in the current combo!
        return false;
      }

      // For this to be the only visible combo, then the base variant must be invisible
      // (We know this function isn't called when currentCombo is base).
      if (
        !isInvisible(
          getTplVisibilityAsDescendant(tpl, [getBaseVariant(frame.component)])
        )
      ) {
        return false;
      }

      const allCompVariants = [
        ...findNonEmptyCombos(frame.component),
        ...this.getVariantsForNode(tpl).map((it) => [it]),
        ...this.site.globalVariantGroups
          .flatMap((g) => g.variants)
          .map((v) => [v]),
      ];

      for (let combo of allCompVariants) {
        if (currentCombo.length === 1 && isScreenVariant(currentCombo[0])) {
          // If targeting a screen variant, ignore its ancestors, because if a
          // node is visible in a screen variant currentCombo[0] it will also
          // be visible in all its ancestor screen variants.
          combo = combo.filter(
            (v) =>
              !isScreenVariant(v) ||
              !isAncestorScreenVariant(v, currentCombo[0])
          );
        }
        if (isBaseVariant(combo) || arrayEqIgnoreOrder(currentCombo, combo)) {
          // We've already checked base and currentCombo
          continue;
        }
        if (isMaybeVisible(getTplVisibilityAsDescendant(tpl, combo))) {
          // Found a different variant where this tpl is visible!
          return false;
        }
      }
      // Finally, we did not find any other combo where this tpl is visible, so
      // it must only be visible on this combo
      return true;
    };

    let targetCombo = currentCombo;

    if (
      DEVFLAGS.framerTargeting &&
      !opts.forVisibility &&
      !isBaseVariant(currentCombo)
    ) {
      // In framer-style targeting, if we're targeting a variant that is the only visible
      // variant, then we target the base instead. The exception is forVisibility, where
      // we'd need to target the currentCombo if we want to switch visibility on and off
      const isCurrentVsEmpty = () => {
        const vs = tryGetVariantSetting(tpl, currentCombo);
        if (!vs) {
          return true;
        }

        // If any attrs, args, or text is set, then it's not empty
        if (
          Object.keys(vs.attrs).length > 0 ||
          Object.keys(vs.args).length > 0 ||
          vs.rs.mixins.length > 0 ||
          !!vs.text
        ) {
          return false;
        }

        // If any style is set (except PLASMIC_DISPLAY_NONE) then it's not empty
        if (Object.keys(vs.rs.values).some((r) => r !== PLASMIC_DISPLAY_NONE)) {
          return false;
        }

        return true;
      };

      if (isCurrentVsEmpty() && isOnlyVisibleOnCurrentCombo()) {
        targetCombo = [getBaseVariant(frame.component)];
      }
    }
    return ensureValidCombo(frame.component, targetCombo);
  }

  getVariantComboForStackFrame(frame: ComponentVariantFrame) {
    return ensureValidCombo(frame.component, [
      ...frame.getTargetVariants(),
      ...this.globalFrame.getTargetVariants(),
    ]);
  }

  getCurrentVariantCombo() {
    return this.getVariantComboForStackFrame(last(this.stack));
  }

  getRootVariantCombo() {
    return this.getVariantComboForStackFrame(this.stack[0]);
  }

  /**
   * Returns VariantSettings that are currently activated for `tpl`, according to
   * `getActivatedVariantsForNode()`.  The returned VariantSettings are in
   * "application order" -- lowest-priority first.
   */
  getActivatedVariantSettingsForNode(tpl: TplNode) {
    // Get all the variants that are activated, a mix of global and local
    const variants = [...this.getActivatedVariantsForNode(tpl)];

    const frame = this.getContainingFrame(tpl);
    if (!frame) {
      // This is an ArenaFrame's sysroot TplComponent, so should only have one vsetting
      // that is always active
      assert(
        tpl.vsettings.length === 1,
        () =>
          `Expected only one vsettings, but got ${tpl.vsettings
            .map((vs) => vs.variants.map((v) => v.name).join(","))
            .join("; ")}`
      );
      return {
        variants,
        vsettings: [tpl.vsettings[0]],
      };
    }

    const vsettings = sortedVariantSettingStack(
      tpl.vsettings,
      [...variants],
      makeVariantComboSorter(this.site, frame.component)
    );
    return { variants, vsettings };
  }

  /**
   * Returns all Variants that are activated for `tpl` in its frame -- either by pinning
   * variants, selecting variants, or setting its containing TplComponent's args.  Includes
   * both local and global variants.
   */
  getActivatedVariantsForNode(tpl: TplNode): Set<Variant> {
    const frame = this.getContainingFrame(tpl);
    if (!frame) {
      return new Set([this.site.globalVariant]);
    }

    const component = frame.component;
    const variants: Set<Variant> = new Set([ensureBaseVariant(component)]);

    if (frame instanceof TransientComponentVariantFrame) {
      // If this frame is a transient frame (so we are in spotlight mode), then
      // activated variants for this component will first include any variant
      // args passed to the TplComponent that we are now spotlighting
      for (const vg of component.variantGroups) {
        const arg = this.getEffectiveArgForParam(frame.tplComponent, vg.param);
        if (!arg) {
          continue;
        }
        if (isKnownVariantsRef(arg.expr)) {
          arg.expr.variants.forEach((v) => variants.add(v));
        } else {
          assert(
            this.getCanvasEnvForTpl,
            "Expected VariantTplMgr to have getCanvasEnvForTpl"
          );
          const canvasEnv = this.getCanvasEnvForTpl(tpl);
          const evaledExpr = tryEvalExpr(
            asCode(arg.expr, {
              projectFlags: computedProjectFlags(this.site),
              component,
              inStudio: true,
            }).code,
            canvasEnv ?? {}
          ).val;
          const tryToAddByName = (vname: string) => {
            const variant = vg.variants.find(
              (v) => toVarName(v.name) === toVarName(vname)
            );
            if (variant) {
              variants.add(variant);
            }
          };
          if (Array.isArray(evaledExpr)) {
            evaledExpr.forEach((v) => tryToAddByName(v));
          } else if (typeof evaledExpr === "string") {
            tryToAddByName(evaledExpr);
          } else if (evaledExpr && isStandaloneVariantGroup(vg)) {
            variants.add(vg.variants[0]);
          }
        }
      }
    }

    // Next, consider the variants that are pinned or set as targets
    const allCompVariants = allComponentVariants(component, {
      includeSuperVariants: true,
    });
    const componentPins = frame.getPinnedVariants();
    for (const variant of allCompVariants) {
      if (frame.getTargetVariants().includes(variant)) {
        if (isPrivateStyleVariant(variant)) {
          // only add a private style variant if it is for the argument node
          if (variant.forTpl === tpl) {
            variants.add(variant);
          }
        } else {
          variants.add(variant);
        }
      }

      const pin = componentPins.get(variant);
      if (pin === true) {
        variants.add(variant);
      } else if (pin === false) {
        variants.delete(variant);
      }
    }

    const implicitlyActivated = getImplicitlyActivatedStyleVariants(
      allCompVariants,
      variants,
      tpl
    );
    implicitlyActivated.forEach((v) => variants.add(v));

    const globalPins = this.globalFrame.getPinnedVariants();
    for (const variant of allGlobalVariants(this.site, {
      includeDeps: "direct",
    })) {
      if (
        this.globalFrame.getTargetVariants().includes(variant) ||
        globalPins.get(variant) === true
      ) {
        variants.add(variant);
      }
    }

    return variants;
  }

  getEffectiveVariantComboForNode(tpl: TplNode) {
    return [...this.getActivatedVariantsForNode(tpl)];
  }

  /**
   * Returns the currently targeted variants for the argument tpl.
   */
  getTargetVariantComboForNode(tpl: TplNode, opts?: StylePropOpts) {
    return this._getTargetVariantComboForNode(tpl, {
      includePrivate: true,
      ignoreSlotDefaultContent: false,
      ...opts,
    });
  }

  getCurrentSharedVariantComboForNode(tpl: TplNode) {
    return this._getTargetVariantComboForNode(tpl, {
      includePrivate: false,
      ignoreSlotDefaultContent: false,
    });
  }

  /**
   * Typically tpl that is a slot's default content can only target the
   * base variant, so getCurrentVariantComboForNode() would only return
   * the base variant.  But for the purpose of computing the defined
   * indicator, even for default slot content nodes, we do want to
   * compute its variant setting source stack relative to the current
   * targets, not just always the base variant (otherwise, its variant
   * setting source stack -- which only targets the base variant -- will
   * always match up with its currentVariantComboForNode(tpl), which is also
   * just the base variant, leading to an indicator dot that is always "set"
   * / "blue", even when the frame is not targeting the base variant).
   */
  getTargetIndicatorComboForNode(tpl: TplNode, opts?: StylePropOpts) {
    return this._getTargetVariantComboForNode(tpl, {
      includePrivate: true,
      ignoreSlotDefaultContent: true,
      forVisibility: opts?.forVisibility,
    });
  }

  ensureCurrentVariantSetting(tpl: TplNode, owningComponent?: Component) {
    return this._ensureVariantSetting(
      tpl,
      this.getTargetVariantComboForNode(tpl),
      owningComponent
    );
  }

  targetRshForNode(tpl: TplNode) {
    return RSH(this.ensureCurrentVariantSetting(tpl).rs, tpl);
  }

  tryGetCurrentSharedVariantSetting(tpl: TplNode) {
    return tryGetVariantSetting(
      tpl,
      this.getCurrentSharedVariantComboForNode(tpl)
    );
  }

  // owningComponent: the component owning tpl. Useful when tpl is not attached
  // yet.
  ensureVariantSetting(
    tpl: TplNode,
    variantCombo?: VariantCombo,
    owningComponent?: Component
  ) {
    variantCombo = variantCombo || this.getTargetVariantComboForNode(tpl);
    const allCompVariants = this.getVariantsForNode(tpl);
    assert(
      variantCombo.every(
        (v) => isGlobalVariant(v) || allCompVariants.includes(v)
      ),
      "Variant combo has variants from other component"
    );
    return this._ensureVariantSetting(tpl, variantCombo, owningComponent);
  }

  getCurrentVariantSetting(tpl: TplNode) {
    const vs = this.tryGetTargetVariantSetting(tpl);
    if (!vs) {
      const variants = this.getTargetVariantComboForNode(tpl)
        .map((v) => v.name)
        .join(", ");
      const tplComponent =
        swallow(() => getComponentDisplayName(getTplOwnerComponent(tpl))) ||
        "(unattached)";
      throw new Error(
        `Missing variant setting for variant "${variants}" on tpl "${summarizeTpl(
          tpl
        )}" in component "${tplComponent}`
      );
    }
    return vs;
  }

  tryGetTargetVariantSetting(tpl: TplNode, opts?: StylePropOpts) {
    return tryGetVariantSetting(
      tpl,
      this.getTargetVariantComboForNode(tpl, opts)
    );
  }

  private _ensureBaseRuleVariantSetting(
    tpl: TplNode,
    variantCombo: VariantCombo,
    owningComponent?: Component
  ) {
    const component = this._getComponentForTpl(tpl, owningComponent);
    if (isTplVariantable(component.tplTree)) {
      ensureBaseRuleVariantSetting(tpl, variantCombo, component.tplTree);
    }
  }

  private _getComponentForTpl(tpl: TplNode, owningComponent?: Component) {
    return (
      owningComponent ||
      $$$(tpl).tryGetOwningComponent() ||
      this.getOwningComponentForNewNode()
    );
  }

  private _ensureVariantSetting(
    tpl: TplNode,
    variantCombo: VariantCombo,
    owningComponent?: Component
  ): VariantSetting {
    const component = this._getComponentForTpl(tpl, owningComponent);

    assert(
      component === this.getOwningComponentForNewNode(),
      `Cannot to edit element outside of current component context`
    );

    variantCombo = ensureValidCombo(component, variantCombo);
    this._ensureBaseRuleVariantSetting(tpl, variantCombo, component);

    let vs = tryGetVariantSetting(tpl, variantCombo);
    if (!vs) {
      vs = mkVariantSetting({ variants: variantCombo });

      assert(!addingBaseToTplWithExistingBase(tpl, variantCombo), () => {
        const newBaseComponent =
          variantCombo[0] === this.site.globalVariant
            ? "[globalVariant]"
            : swallow(() =>
                getComponentDisplayName(
                  this.tplMgr.findComponentContainingBaseVariant(
                    variantCombo[0]
                  )
                )
              ) || "(unattached)";
        const oldBaseComponent =
          swallow(() =>
            getComponentDisplayName(
              this.tplMgr.findComponentContainingBaseVariant(
                tpl.vsettings[0].variants[0]
              )
            )
          ) || "(unattached)";
        const tplComponent =
          swallow(() => getComponentDisplayName(getTplOwnerComponent(tpl))) ||
          "(unattached)";
        return `Tried adding base variant of component "${newBaseComponent}" to tpl "${summarizeTpl(
          tpl
        )}" in component "${tplComponent}" - currently has base variant of component "${oldBaseComponent}". Tpl's parent is ${
          tpl.parent?.uuid
        }`;
      });
      ensureComponentsObserved([component]);

      tpl.vsettings.push(vs);
    }
    return vs;
  }

  effectiveVariantSetting(
    tpl: TplNode,
    variantCombo?: VariantCombo
  ): EffectiveVariantSetting {
    if (variantCombo) {
      const component = ensure(
        this.getOwningComponent(tpl),
        "Given tpl must have owning component"
      );
      const vsettings = sortedVariantSettingStack(
        tpl.vsettings,
        variantCombo,
        makeVariantComboSorter(this.site, component)
      );
      return new EffectiveVariantSetting(
        tpl,
        vsettings,
        this.site,
        variantCombo
      );
    } else {
      const { variants, vsettings } =
        this.getActivatedVariantSettingsForNode(tpl);
      return new EffectiveVariantSetting(tpl, vsettings, this.site, variants);
    }
  }

  /**
   * Returns the EffectiveVariantSetting for the target `tpl` for the currently-targeted
   * VariantCombo (ignoring pinned variants)
   */
  effectiveTargetVariantSetting(tpl: TplNode) {
    return this.effectiveVariantSetting(
      tpl,
      this.getTargetVariantComboForNode(tpl)
    );
  }

  mkTplComponentWithDefaults(component: Component) {
    return this.mkTplComponentX({
      component,
    });
  }

  mkTplComponentX(props: Omit<MkTplComponentParams, "baseVariant">) {
    const baseVariant = this.getBaseVariantForNewNode();
    const tpl = mkTplComponentX({ ...props, baseVariant });
    const exp = RSH(this.ensureBaseVariantSetting(tpl).rs, tpl);
    exp.set("max-width", "100%");
    if (isCodeComponent(props.component)) {
      exp.set("object-fit", "cover");
    }
    this.initializeVariantsForNewTpl(tpl);
    return tpl;
  }

  mkSlot(param: SlotParam, defaultContents?: TplNode[]) {
    const component = this.getOwningComponentForNewNode();
    assert(
      component.params.includes(param),
      "Param must belong to owning component"
    );

    if (defaultContents) {
      // Default contents can only have settings for the base variant
      defaultContents.forEach((node) =>
        this.ensureSlotDefaultContentSetting(node)
      );
    }

    const slot = mkSlot(param, defaultContents);
    this.initializeVariantsForNewTpl(slot);
    return slot;
  }

  ensureSlotDefaultContentSetting(node: TplNode) {
    // To be slot default content, there can only be base variant settings.
    // So we copy the currently effective variant settings for this node,
    // and copy it into the base variant setting.  We can skip descendants
    // of VirtualRenderExprs, because they already only have base variant
    // settings anyway, and updating those nodes unnecessarily would
    // fork those VirtualRenderExprs.
    for (const tpl of flattenTplsWithoutVirtualDescendants(node)) {
      if (isTplVariantable(tpl)) {
        // Make whatever the user is looking at right now the base variant
        // setting for this node
        const baseVs = this.ensureBaseVariantSetting(tpl);
        adaptEffectiveVariantSetting(
          tpl,
          baseVs,
          this.effectiveVariantSetting(tpl)
        );
        if (baseVs.dataCond) {
          // Always visible
          baseVs.dataCond = null;
        }

        // default content nodes only allowed to have base variant settings
        if (tpl.vsettings.length !== 1) {
          tpl.vsettings = [baseVs];
        }
      }
    }
  }

  mkTplTagX(
    tag: string,
    opts?: MkTplTagOpts,
    rawChildren?: ChildSet,
    forceBase?: boolean
  ) {
    const baseVariant = this.getBaseVariantForNewNode();
    const rawChildrenArr = ensureArray(rawChildren || []);
    const children = rawChildrenArr.map((child) =>
      isKnownTplNode(child) ? child : this.mkTplInlinedText(child)
    );
    const tpl = mkTplTagX(tag, { baseVariant, ...opts }, ...children);
    this.initializeVariantsForNewTpl(tpl, forceBase);
    return tpl;
  }

  mkTplInlinedText = (
    text: string,
    tag: string = "div",
    opts?: MkTplTagOpts
  ) => {
    const tpl = this.mkTplTagX(tag, { type: TplTagType.Text, ...(opts || {}) });
    this.ensureBaseVariantSetting(tpl).text = new RawText({
      text,
      markers: [],
    });
    return tpl;
  };

  mkTplImage = (opts: {
    asset?: ImageAsset;
    type?: ImageAssetType;
    iconColor?: string;
    attrs?: AttrsSpec;
  }) => {
    const type = ensure(
      opts.asset ? opts.asset.type : opts.type,
      "mkTplImage expects asset or type"
    );
    const finalAttrs = L.assign(
      {},
      type === ImageAssetType.Picture ? { loading: "lazy" } : {},
      opts.attrs,
      opts.asset
        ? {
            [getTagAttrForImageAsset(opts.asset.type as ImageAssetType)]:
              new ImageAssetRef({ asset: opts.asset }),
          }
        : {}
    );
    const node = this.mkTplTagX(type === ImageAssetType.Icon ? "svg" : "img", {
      type: TplTagType.Image,
      attrs: finalAttrs,
    });

    const expr = RSH(this.ensureBaseVariantSetting(node).rs, node);
    // Same object-fit default as Figma
    expr.set("object-fit", "cover");
    expr.set("max-width", "100%");
    if (type === ImageAssetType.Icon && opts.iconColor) {
      expr.set("color", opts.iconColor);
    }

    return node;
  };

  /**
   * @param forceBase By default, if current variant is not the base variant, the
   *   new Tpl is hidden in the base variant.  forceBase makes the new Tpl
   *   visible in the base variant (and thus all variants), regardless of what the
   *   current variant is.
   */
  private initializeVariantsForNewTpl(tpl: TplNode, forceBase?: boolean) {
    const baseVs = this.ensureBaseVariantSetting(tpl);
    if (isKnownTplSlot(tpl)) {
      return;
    }
    const rsh = RSH(baseVs.rs, tpl);
    // Setting flex on text blocks breaks text-align. Setting flex on image also
    // doesn't make sense.
    if (isTplContainer(tpl) || isTplColumns(tpl) || isTplColumn(tpl)) {
      rsh.merge({
        display: "flex",
      });
    }
    if (!rsh.get("position")) {
      // Initialize the position of new tpl to relative. If the parent is
      // free container, it should then convert it into absolute later at
      // insertion.
      rsh.merge({ position: "relative" });
    }

    const curVs = this.ensureCurrentVariantSetting(
      tpl,
      this.getOwningComponentForNewNode()
    );
    const variants = this.getTargetVariantComboForNode(tpl);
    if (!isBaseVariant(variants) && !forceBase) {
      setTplVisibility(tpl, baseVs.variants, TplVisibility.DisplayNone);
      setTplVisibility(tpl, curVs.variants, TplVisibility.Visible);
    }
  }

  private getVariantSettingForArg(tpl: TplComponent, argVar: Var) {
    return ensure(
      this.tryGetVariantSettingForArg(tpl, argVar),
      "Expected existing variant setting for arg"
    );
  }

  private tryGetVariantSettingForArg(tpl: TplComponent, argVar: Var) {
    return isSlotVar(tpl.component, argVar)
      ? this.tryGetBaseVariantSetting(tpl)
      : this.tryGetTargetVariantSetting(tpl);
  }

  private ensureVariantSettingForArg(tpl: TplComponent, argVar: Var) {
    return isSlotVar(tpl.component, argVar)
      ? this.ensureBaseVariantSetting(tpl)
      : this.ensureCurrentVariantSetting(tpl);
  }

  getArg(tpl: TplComponent, argVar: Var) {
    const vs = this.tryGetVariantSettingForArg(tpl, argVar);
    return vs ? this.tplMgr.getArg(tpl, vs, argVar) : undefined;
  }

  getEffectiveArgForParam(
    tpl: TplComponent,
    param: Param
  ): Readonly<Arg> | undefined {
    const argAndSource = this.getEffectiveArgAndSourceForParam(tpl, param);
    return argAndSource ? argAndSource.value : undefined;
  }

  getEffectiveArgAndSourceForParam(
    tpl: TplComponent,
    param: Param
  ): ReplaceKey<ArgSource, "value", Readonly<Arg>> | undefined {
    const vs = this.effectiveVariantSetting(tpl);
    const argAndSourceStack = vs.getArgSource(param);
    return argAndSourceStack ? L.last(argAndSourceStack) : undefined;
  }

  getArgAndDefinedIndicator(
    tpl: TplComponent,
    param: Param
  ): [DefinedIndicatorType, Readonly<Arg> | undefined] {
    const vs = this.effectiveVariantSetting(tpl);
    const argAndSourceStack = vs.getArgSource(param);

    const component = ensure(
      this.getOwningComponent(tpl),
      "tpl is expected to have an owning component"
    );
    const defined: DefinedIndicatorType = computeDefinedIndicator(
      this.site,
      component,
      argAndSourceStack,
      this.getTargetIndicatorComboForNode(tpl)
    );
    return [
      defined,
      argAndSourceStack
        ? ensure(
            L.last(argAndSourceStack),
            "Arg source is expected to be non-empty"
          ).value
        : undefined,
    ];
  }

  delArg(tpl: TplComponent, argVar: Var) {
    return this.delArgFromVariantSetting(
      tpl,
      argVar,
      this.ensureVariantSettingForArg(tpl, argVar)
    );
  }

  delArgFromVariantSetting(tpl: TplComponent, argVar: Var, vs: VariantSetting) {
    return this.tplMgr.delArg(tpl, vs, argVar);
  }

  tryDelArg(tpl: TplComponent, argVar: Var) {
    return this.tplMgr.tryDelArg(
      tpl,
      this.getVariantSettingForArg(tpl, argVar),
      argVar
    );
  }

  setArg(tpl: TplComponent, argVar: Var, expr: Expr) {
    return this.setArgUnderVariantSetting(
      tpl,
      argVar,
      expr,
      this.ensureVariantSettingForArg(tpl, argVar)
    );
  }

  setArgUnderVariantSetting(
    tpl: TplComponent,
    argVar: Var,
    expr: Expr,
    vs: VariantSetting
  ) {
    return this.tplMgr.setArg(tpl, vs, argVar, expr);
  }

  applyMixin(tpl: TplNode, mixin: Mixin, variantCombo?: VariantCombo) {
    const vs = this.ensureVariantSetting(tpl, variantCombo);
    if (!vs.rs.mixins.includes(mixin)) {
      vs.rs.mixins.push(mixin);
    }

    // Clear all style props set by mixin from targetVs.rs.children, because
    // targetVs.rs.children rules have higher precedence than mixin rules
    const targetExp = RSH(vs.rs, tpl);
    targetExp.clearAll(getAllDefinedStyles(mixin.rs));
  }

  removeMixin(tpl: TplNode, mixin: Mixin, variantCombo?: VariantCombo) {
    const vs = this.ensureVariantSetting(tpl, variantCombo);
    removeFromArray(vs.rs.mixins, mixin);
  }

  /**
   * Returns the frame containing the argument `tpl`.  If the `tpl` is not attached
   * to a parent yet, then returns the top-most frame.  If the `tpl` is the sys root
   * of an ArenaFrame, then returns undefined.
   */
  getContainingFrame(tpl: TplNode) {
    if (isFrameRootTplComponent(this.site, tpl)) {
      return undefined;
    }
    const component = $$$(tpl).tryGetOwningComponent();
    if (component) {
      const frame = this.getComponentFrame(component);
      if (!frame) {
        console.log(
          `debug info for getComponentFrame issue: tpl ${summarizeTpl(
            tpl
          )} from component ${
            component.name
          } does not have a frame; current stack: ${this.stack
            .map((s) => s.component.name)
            .join(", ")}`,
          tpl,
          component,
          this.stack
        );
        throw new Error("getComponentFrame did not return a valid frame");
      }
      return frame;
    }
    return ensure(L.last(this.stack), "Stack must have a valid frame");
  }

  isTargetingNonBaseVariant(tpl: TplNode) {
    return !!this.getContainingFrame(tpl)
      ?.getTargetVariants()
      .filter((it) => !isBaseVariant(it)).length;
  }

  private getComponentFrame(component: Component) {
    return arrayReversed(this.stack).find(
      (frame) => frame.component === component
    );
  }
}

export function ensureBaseVariantSetting(component: Component, tpl: TplNode) {
  const vs = tpl.vsettings.find((_vs) => isBaseVariant(_vs.variants));
  if (vs) {
    return vs;
  }

  const variant = ensureBaseVariant(component);
  const baseVs = mkVariantSetting({ variants: [variant] });
  assert(
    !addingBaseToTplWithExistingBase(tpl, variant),
    "Trying to add base vs to tpl with existing base vs"
  );
  tpl.vsettings.push(baseVs);

  return baseVs;
}
