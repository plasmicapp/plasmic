import { RSH, RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantCombo,
  ensureVariantSetting,
  getGlobalVariants,
  isBaseVariant,
  tryGetBaseVariantSetting,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import { ComponentGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import { isNonNil } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import {
  ExprCtx,
  codeLit,
  getCodeExpressionWithFallback,
  isCodeLitVal,
  isRealCodeExpr,
} from "@/wab/shared/core/exprs";
import { CONTENT_LAYOUT } from "@/wab/shared/core/style-props";
import {
  isTplComponent,
  isTplTag,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import { PLASMIC_DISPLAY_NONE } from "@/wab/shared/css";
import {
  EffectiveVariantSetting,
  getEffectiveVariantSetting,
  getTplComponentActiveVariantsByVs,
} from "@/wab/shared/effective-variant-setting";
import { CanvasEnv, tryEvalExpr } from "@/wab/shared/eval";
import {
  Component,
  Expr,
  ObjectPath,
  TplComponent,
  TplNode,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";

// When doing "DisplayNone" in css, we set `display: none`.  However,
// we don't actually want to set that in our RuleSet, because
// `display` also defines the layout (`display: flex` vs `display: block`).
// Setting `display:none` here would erase that information; suppose we
// have a flex box, and we set it to `display: none`, and now we want it
// to be "visible" again; we don't know whether to set it to
// `display: block` or `display: flex`.  So instead, we use this additional
// fake style prop to track whether display should be none or not.  If
// we want display none, then `plasmic-display-none` is set to "true";
// if _don't_ want display none, then `plasmic-display-none` is set to "false".
// We need to explicitly set to "false", instead of just clearing that
// prop, because this VariantSetting may be used to override another
// VariantSetting that _does_ have plasmic-display-none set to "true".
// Anyway, we track this info here, and then we make use of it when
// generating the css, in appendVisibilityStylesForTpl().

export enum TplVisibility {
  Visible = "visible",
  DisplayNone = "displayNone",
  NotRendered = "notRendered",
  CustomExpr = "customExpr",
}

/**
  We need to override a display:none from
  another vsetting. Unfortunately there's no literal opposite of
  display:none; we have to set display to _something_ to override it, but
  to what? There's no perfect answer here, which is why we want
  to avoid doing this as much as possible.  We use some heuristics:
*/
export function normalizeDisplayValue(displayVal: string) {
  if (displayVal === CONTENT_LAYOUT) {
    // For content layout, we set display to grid to make it visible
    return "grid";
  } else {
    // For everything else, this should be a valid display value
    return displayVal;
  }
}

export function getVisibilityLabel(visibility: TplVisibility) {
  switch (visibility) {
    case TplVisibility.Visible:
      return "Visible";
    case TplVisibility.DisplayNone:
      return "Not visible";
    case TplVisibility.NotRendered:
      return "Not rendered";
    case TplVisibility.CustomExpr:
      return "Dynamic value";
    default:
      throw new Error(`Unexpected visibility ${visibility}`);
  }
}

export function getVisibilityDataProp(visibility: TplVisibility) {
  switch (visibility) {
    case TplVisibility.Visible:
      return "display-visible";
    case TplVisibility.DisplayNone:
      return "display-not-visible";
    case TplVisibility.NotRendered:
      return "display-not-rendered";
    case TplVisibility.CustomExpr:
      return "display-custom-code";
    default:
      throw new Error(`Unexpected visibility ${visibility}`);
  }
}

export function getEffectiveVsVisibility(effectiveVs: EffectiveVariantSetting) {
  const dataCond = effectiveVs.dataCond;
  if (!!dataCond && isCodeLitVal(dataCond, false)) {
    return TplVisibility.NotRendered;
  } else if (
    !!dataCond &&
    (!isCodeLitVal(dataCond, true) || isRealCodeExpr(dataCond))
  ) {
    return TplVisibility.CustomExpr;
  } else if (effectiveVs.rsh().getRaw(PLASMIC_DISPLAY_NONE) === "true") {
    return TplVisibility.DisplayNone;
  } else {
    return TplVisibility.Visible;
  }
}

export function getEffectiveTplVisibility(tpl: TplNode, combo: VariantCombo) {
  const effectiveVs = getEffectiveVariantSetting(tpl, combo);
  return getEffectiveVsVisibility(effectiveVs);
}

export function setTplVisibilityToDisplayNone(
  tpl: TplNode,
  vs: VariantSetting
) {
  vs.dataCond = codeLit(true);
  RSH(vs.rs, tpl).set(PLASMIC_DISPLAY_NONE, "true");
}

export function setTplVisibility(
  tpl: TplNode,
  combo: VariantCombo,
  visibility: TplVisibility
) {
  const vs = ensureVariantSetting(tpl, combo);
  const rsh = RSH(vs.rs, tpl);
  if (visibility === TplVisibility.NotRendered) {
    // Not rendered; set dataCond to false, and clear everything else
    vs.dataCond = codeLit(false);
    rsh.clear(PLASMIC_DISPLAY_NONE);
  } else if (visibility === TplVisibility.DisplayNone) {
    // display-none: set PLASMIC_DISPLAY_NONE flag and render the element.
    setTplVisibilityToDisplayNone(tpl, vs);
  } else if (visibility === TplVisibility.CustomExpr) {
    vs.dataCond = new ObjectPath({
      path: ["true"],
      fallback: codeLit(true),
    });
    rsh.set(PLASMIC_DISPLAY_NONE, "false");
  } else {
    // Making things visible is trickier! First we just clear all visibility settings,
    // so that we are by default visible
    clearTplVisibility(tpl, combo);

    // If this is the base variant, that's all we'd need to do.  But for others,
    // we need to explicitly state what we're doing so that we will override
    // other variants in combination as necessary.
    vs.dataCond = codeLit(true);
    rsh.set(PLASMIC_DISPLAY_NONE, "false");
  }
}

export function clearTplVisibility(tpl: TplNode, combo: VariantCombo) {
  const vs = tryGetVariantSetting(tpl, combo);
  if (!vs) {
    // nothing to do!
    return;
  }

  vs.dataCond = null;
  RSH(vs.rs, tpl).clear(PLASMIC_DISPLAY_NONE);
}

export function getVariantSettingVisibility(
  vs: VariantSetting | EffectiveVariantSetting
) {
  if (!!vs.dataCond && isCodeLitVal(vs.dataCond, false)) {
    return TplVisibility.NotRendered;
  } else if (
    !!vs.dataCond &&
    (!isCodeLitVal(vs.dataCond, true) || isRealCodeExpr(vs.dataCond))
  ) {
    return TplVisibility.CustomExpr;
  } else if (
    new RuleSetHelpers(vs.rs, "div").getRaw(PLASMIC_DISPLAY_NONE) === "true"
  ) {
    return TplVisibility.DisplayNone;
  } else {
    return TplVisibility.Visible;
  }
}

export function hasVisibilitySetting(vs: VariantSetting) {
  return (
    !!vs.dataCond || new RuleSetHelpers(vs.rs, "div").has(PLASMIC_DISPLAY_NONE)
  );
}

export function appendVisibilityStylesForTpl(
  ctx: ComponentGenHelper,
  tpl: TplNode,
  vs: VariantSetting,
  m: Map<string, string>
) {
  const rsh = ctx.getExpr(tpl, vs);
  const rawVisibility = getVariantSettingVisibility(vs);
  if (rawVisibility === TplVisibility.NotRendered) {
    // no style tweaks to make here, only delete fake display property if it is set
    m.delete(PLASMIC_DISPLAY_NONE);
    return;
  } else if (rawVisibility === TplVisibility.DisplayNone) {
    // Add display:none
    m.set("display", "none");
  } else if (rsh.getRaw(PLASMIC_DISPLAY_NONE) === "false") {
    // Uh oh, here we may be explicitly trying to override a display:none from
    // another VariantSetting that is activated.  So, it may be that some
    // rule is setting display:none, and we are generating a rule that is
    // trying to override that.

    // Let's first check if that's the case.
    const needsToOverrideOtherVs = !(
      // We don't need to worry about it if this is the base variant
      // (it never overrides anything),
      (
        isBaseVariant(vs.variants) ||
        // We also don't need to worry about it if if all other variants
        // are visible anyway
        tpl.vsettings.every(
          (vs2) =>
            vs2 === vs ||
            getVariantSettingVisibility(vs2) === TplVisibility.Visible
        )
      )
    );

    if (needsToOverrideOtherVs) {
      if (rsh.has("display")) {
        // if there's an explicit `display` for this vs, then use it;
        m.set("display", normalizeDisplayValue(rsh.get("display")));
      } else if (isTplTag(tpl)) {
        // else for tags, there should be a `display` set on the base,
        // so we use the base variant's `display`.
        const baseVs = tryGetBaseVariantSetting(tpl);
        if (baseVs) {
          const baseRsh = RSH(baseVs.rs, tpl);
          m.set("display", normalizeDisplayValue(baseRsh.get("display")));
        }
      } else if (isTplComponent(tpl)) {
        // For component instances, there should not be a `display` set
        // at all on the TplComponent; instead, the `display` on the
        // actual DOM element will be from the Component root, and will
        // be "flex" if the root is a flex container, "block" if it's a
        // free container, etc.  Now, we are in this awkward position,
        // where the TplComponent has set `display: none` from some other
        // variant, and we need to override it to `display: flex` or
        // `display: block`, depending on what the component root used.
        const componentDisplay = getTplComponentDefaultDisplayByActiveVariants(
          tpl,
          vs.variants
        );
        if (componentDisplay) {
          m.set("display", normalizeDisplayValue(componentDisplay));
        }
      }
    }
  }
  m.delete(PLASMIC_DISPLAY_NONE);
}

/**
 * Returns:
 * - Visible if all ancestors and self are visible
 * - NotRendered if some ancestor or self is NotRendered
 * - DisplayNone if some ancestor or self is DisplayNone
 * - CustomCode if some ancestor or self is CustomCode
 * - ObjectPath if some ancestor or self is ObjectPath
 *
 * Note that NotRendered trumps DisplayNone
 */
export function getTplVisibilityAsDescendant(
  tpl: TplNode,
  combo: VariantCombo,
  includeSelf = true
) {
  let hasDisplayNone = false,
    hasCustomExpr = false;
  const ancestors = (
    includeSelf ? $$$(tpl).ancestors() : $$$(tpl).parents()
  ).toArrayOfTplNodes();
  for (const cur of ancestors) {
    if (isTplVariantable(cur)) {
      const vis = getEffectiveTplVisibility(cur, combo);
      if (vis === TplVisibility.NotRendered) {
        return TplVisibility.NotRendered;
      } else if (vis === TplVisibility.DisplayNone) {
        hasDisplayNone = true;
      } else if (vis === TplVisibility.CustomExpr) {
        hasCustomExpr = true;
      }
    }
  }

  return hasDisplayNone
    ? TplVisibility.DisplayNone
    : hasCustomExpr
    ? TplVisibility.CustomExpr
    : TplVisibility.Visible;
}

/**
 * If visibility is definitely not visible (DisplayNone, NotRendered)
 */
export function isInvisible(visibility: TplVisibility) {
  return (
    visibility === TplVisibility.DisplayNone ||
    visibility === TplVisibility.NotRendered
  );
}

/**
 * If visibilty may be visible (Visible and CustomCode)
 */
export function isMaybeVisible(visibility: TplVisibility) {
  return !isInvisible(visibility);
}

export function getTplComponentDefaultDisplayByActiveVariants(
  tpl: TplComponent,
  activeVariants: VariantCombo
) {
  const activeComponentVariants = getTplComponentActiveVariantsByVs(
    tpl,
    getEffectiveVariantSetting(tpl, activeVariants)
  );
  const activeGlobalVariants = getGlobalVariants(activeVariants);
  return getComponentDisplay(tpl.component, [
    ...activeComponentVariants,
    ...activeGlobalVariants,
  ]);
}

function getComponentDisplay(component: Component, activeVariants: Variant[]) {
  if (isCodeComponent(component)) {
    return component.codeComponentMeta.defaultDisplay ?? "flex";
  }
  const root = component.tplTree;
  if (!isTplVariantable(root)) {
    return undefined;
  }

  const exp = getEffectiveVariantSetting(root, activeVariants).rsh();
  return exp.get("display");
}

/**
 * Returns true iff visibility is hidden (not rendered or display none or a
 * custom code that evaluates to false). If it's visible, it returns false.
 */
export function isVisibilityHidden(
  vis: TplVisibility,
  dataCond: Expr | null | undefined,
  getCanvasEnv: () => CanvasEnv | undefined,
  exprCtx: ExprCtx
): boolean {
  return (
    vis === TplVisibility.NotRendered ||
    vis === TplVisibility.DisplayNone ||
    (vis === TplVisibility.CustomExpr &&
      isNonNil(dataCond) &&
      isRealCodeExpr(dataCond) &&
      !tryEvalExpr(
        getCodeExpressionWithFallback(dataCond as any, exprCtx),
        getCanvasEnv() ?? ({} as CanvasEnv)
      ).val)
  );
}

export function isAlwaysInvisibleTpl(tpl: TplNode) {
  if (!isTplVariantable(tpl)) {
    return false;
  }
  return !tpl.vsettings.some((vs) => {
    return !isInvisible(getEffectiveTplVisibility(tpl, vs.variants));
  });
}
