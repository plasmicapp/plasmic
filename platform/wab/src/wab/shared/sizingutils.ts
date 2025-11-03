import { isTokenRef } from "@/wab/commons/StyleToken";
import {
  IRuleSetHelpersX,
  RSH,
  ReadonlyIRuleSetHelpersX,
  getCssDefault,
} from "@/wab/shared/RuleSetHelpers";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  VariantCombo,
  ensureValidCombo,
  getGlobalVariants,
  isBaseVariant,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { ComponentGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import { assert, ensure, replaceObj } from "@/wab/shared/common";
import {
  PageComponent,
  getEffectiveVariantSettingOfDeepRootElement,
  isPageComponent,
} from "@/wab/shared/core/components";
import { getArenaFrameActiveVariants } from "@/wab/shared/core/sites";
import {
  CONTENT_LAYOUT_FULL_BLEED,
  CONTENT_LAYOUT_WIDE,
  CONTENT_LAYOUT_WIDTH_OPTIONS,
} from "@/wab/shared/core/style-props";
import { createRuleSetMerger, expandRuleSets } from "@/wab/shared/core/styles";
import {
  isCodeComponentRoot,
  isComponentRoot,
  isTplColumn,
  isTplComponent,
  isTplIcon,
  isTplImage,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import { parseCssNumericNew } from "@/wab/shared/css";
import {
  getEffectiveVariantSetting,
  getTplComponentActiveVariantsByVs,
} from "@/wab/shared/effective-variant-setting";
import {
  makeExpProxy,
  makeExpandedExp,
  makeReadonlyExpProxy,
  makeReadonlyExpandedExp,
} from "@/wab/shared/exprs";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import { keyedComputedFn } from "@/wab/shared/mobx-util";
import {
  ArenaFrame,
  Component,
  TplComponent,
  TplNode,
  Variant,
  VariantSetting,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import { Raw, generate, parse, walk } from "css-tree";
import memoizeOne from "memoize-one";

export function isSizeProp(prop: string): prop is "width" | "height" {
  return prop === "width" || prop === "height";
}

export function deriveSizeStyleValue(
  prop: "width" | "height",
  val: string,
  isStudio?: boolean
) {
  if (val === "stretch") {
    return "100%";
  } else if (val === "wrap") {
    return "auto";
  } else if (CONTENT_LAYOUT_WIDTH_OPTIONS.includes(val)) {
    return "100%";
  } else {
    return val;
  }
}

export function getViewportAwareHeight(val: string): string {
  let ast;
  try {
    ast = parse(val, { context: "value" });
  } catch {
    // If parsing fails, fall back to the original value
    return val;
  }

  walk(ast, {
    enter(node) {
      if (node.type === "Dimension" && node.unit === "vh") {
        const numVal = parseFloat(node.value);
        replaceObj<Raw>(node, {
          type: "Raw",
          value: `calc(var(--viewport-height) * ${numVal} / 100)`,
        });
      }
    },
  });

  return generate(ast);
}

export function isSpecialSizeVal(val: string) {
  return [
    "stretch",
    "wrap",
    "default",
    CONTENT_LAYOUT_FULL_BLEED,
    CONTENT_LAYOUT_WIDE,
  ].includes(val);
}

export function hasSpecialSizeVal(tpl: TplNode, vs: VariantSetting) {
  const rsh = RSH(vs.rs, tpl);
  for (const dim of ["width", "height"]) {
    if (isSpecialSizeVal(rsh.get(dim))) {
      return true;
    }
  }
  return false;
}

export function deriveSizeStylesForTpl(
  ctx: ComponentGenHelper,
  tpl: TplNode,
  vs: VariantSetting
) {
  const exp = ctx.getExpr(tpl, vs);
  const _getTplComponentDefaultSize = memoizeOne(() =>
    isTplComponent(tpl)
      ? getTplComponentDefaultSize(ctx, tpl, vs.variants)
      : undefined
  );
  const _getMixinExpr = memoizeOne(() => {
    if (vs.rs.mixins.length > 0) {
      return createRuleSetMerger(
        expandRuleSets(vs.rs.mixins.map((m) => m.rs)),
        tpl
      );
    }
    return undefined;
  });
  const _getTokenResolver = memoizeOne(() =>
    ctx.siteHelper.makeTokenRefResolver()
  );
  const _getParentContainerType = memoizeOne(() => {
    const parentExp = getParentExp(ctx, tpl, vs.variants);
    if (parentExp) {
      return getRshContainerType(parentExp);
    }
    return undefined;
  });

  const shouldNotShrink = (
    dim: "width" | "height",
    val: string | undefined
  ) => {
    if ((val === undefined || val === "default") && isTplComponent(tpl)) {
      val = _getTplComponentDefaultSize()?.[dim];
    }

    const isNonShrinkableSize = () => {
      let setOrMixinVal = val;
      if (!setOrMixinVal) {
        // maybe a mixin is setting a size?
        const mixinExpr = _getMixinExpr();
        if (mixinExpr) {
          setOrMixinVal = mixinExpr.getRaw(dim);
        }
      }
      if (setOrMixinVal) {
        const realVal = isTokenRef(setOrMixinVal)
          ? _getTokenResolver()(setOrMixinVal) ?? setOrMixinVal
          : setOrMixinVal;

        return isExplicitSize(realVal) && !isExplicitPercentage(realVal);
      }

      return false;
    };

    if (isNonShrinkableSize()) {
      const parentContainerType = _getParentContainerType();
      if (parentContainerType) {
        if (
          (dim === "width" &&
            parentContainerType === ContainerLayoutType.flexRow) ||
          (dim === "height" &&
            parentContainerType === ContainerLayoutType.flexColumn)
        ) {
          // When something is explicitly sized, we tack on "flex-shrink: 0".
          // This is subject to issues described here:
          // (see https://paper.dropbox.com/doc/Sizing-width-and-height--AzkqrxqnP4igAZj128GHAMpIAg-8c4Q22W7oe8bZGA16HlGj#:uid=923038029273965532789953&h2=No-longer-in-use)
          // So this is a known bug.  Say, in base variant, parent is hstack,
          // element width is fixed-sized, so we have `flex-shrink: 0`.  But
          // in variant X, parent is vstack, but we still have `flex-shrink: 0`
          // since the style from base is always applied.  That means that we
          // will not shrink in the height direction!  If we had a height of
          // 100%, we would take up the entire parent height.
          return true;
        }
      }
    }

    return false;
  };

  const styles: Record<string, string> = {};
  const fillDimStyles = (dim: "width" | "height") => {
    let val: string | undefined = exp.getRaw(dim);
    if (
      isTplIcon(tpl) &&
      dim === "height" &&
      (val === "auto" || val === "wrap" || (!val && isBaseVariant(vs.variants)))
    ) {
      // Auto-sized icons have size "1em"
      val = "1em";
    }

    if (val) {
      let derivedVal = deriveSizeStyleValue(dim, val, ctx.isStudio);
      if (derivedVal) {
        if (isComponentRoot(tpl) && ctx.isStudio && derivedVal === "auto") {
          const component = $$$(tpl).tryGetOwningComponent();
          if (component && isPageComponent(component)) {
            derivedVal = "100%";
          }
        }
        styles[dim] = derivedVal;
      }
    }
    if (dim === "width" && val === "wrap") {
      if (isTplTag(tpl) && isComponentRoot(tpl)) {
        // If this is a component root that is wrapping, then we swap
        // display to `inline-X`.  This is so that if you are using this
        // component outside of Plasmic context (say, a Plasmic Button
        // that's supposed to wrap, but is placed in a `display:block`
        // container, which would cause it to span the whole container
        // width).
        const effectiveExp = ctx.getEffectiveExpr(tpl, vs.variants);
        styles["display"] = `inline-${effectiveExp.get("display")}`;
      }
    }
    if (val === "stretch") {
      // If this element is set to "stretch", then we tack on a min-size of
      // 0 to override the implied minimum size for flex children.  See
      // https://app.clubhouse.io/plasmic/story/5692/figure-out-a-good-solution-to-implied-minimum
      styles[`min-${dim}`] = "0";
    }

    if (shouldNotShrink(dim, val)) {
      styles["flex-shrink"] = "0";
    }

    if (dim === "width") {
      // Content layout children set column-start/end with !important, so that they override
      // .parent > * { grid-column: 4; } that is set by the content layout, in case the parent
      // ends up after the child in the stylesheet. Since (.parent > *) and (.element) will have
      // the same specificity.
      if (val === CONTENT_LAYOUT_FULL_BLEED) {
        styles["grid-column-start"] = "1 !important";
        styles["grid-column-end"] = "-1 !important";
        styles["width"] = "100%";
      } else if (val === CONTENT_LAYOUT_WIDE) {
        styles["grid-column-start"] = "3 !important";
        styles["grid-column-end"] = "-3 !important";
        styles["width"] = "100%";
      } else if (
        val === "stretch" &&
        exp.get("position") === "absolute" &&
        _getParentContainerType() === "content-layout"
      ) {
        // If parent is content-layout, and child is absolutely-positioned,
        // then set width to standard-width. Otherwise, child will not
        // have the width of the standard-width.
        // see https://app.shortcut.com/plasmic/story/33102/page-layout-position-absolute-children-are-not-sized-by-column-width
        styles["width"] = "var(--plsmc-standard-width)";
      }
    }
  };

  fillDimStyles("width");
  fillDimStyles("height");
  return styles;
}

export function isExplicitSize(val: string) {
  return !!parseCssNumericNew(val);
}

export function isExplicitPixelSize(val: string) {
  const parsed = parseCssNumericNew(val);
  return !!parsed && parsed.units === "px";
}

export function isExplicitPercentage(val: string) {
  const parsed = parseCssNumericNew(val);
  return !!parsed && parsed.units === "%";
}

export function makeSizeAwareExpProxy(exp: IRuleSetHelpersX, tpl: TplNode) {
  const isInstance = isTplComponent(tpl);
  return makeExpProxy(
    exp,
    Object.assign(
      {},
      makeReadonlySizeAwareExpProxy(exp, tpl),
      makeExpandedExp({
        set: (prop: string, val: string) => {
          if (isInstance && (prop === "width" || prop === "height")) {
            if (val === "auto") {
              // We translate "auto" to "default"
              val = "default";
            }
          }
          exp.set(prop, val);
        },
      })
    )
  );
}

export function makeReadonlySizeAwareExpProxy(
  exp: ReadonlyIRuleSetHelpersX,
  tpl: TplNode
) {
  const isInstance = isTplComponent(tpl);
  return makeReadonlyExpProxy(
    exp,
    makeReadonlyExpandedExp({
      getRaw: (prop: string) => {
        return exp.getRaw(prop);
      },
      getDefault: (prop: string) => {
        if (isInstance && (prop === "width" || prop === "height")) {
          // We return "default" for default width/height for TplComponent,
          // instead of the usual default of "auto"
          return "default";
        } else {
          return getCssDefault(prop, isTplTag(tpl) ? tpl.tag : undefined);
        }
      },
    })
  );
}

/**
 * Returns the default TplComponent size for the argument VariantCombo
 * (corresponding to a specific VariantSetting)
 */
export function getTplComponentDefaultSize(
  compHelper: ComponentGenHelper,
  tpl: TplComponent,
  variantCombo: VariantCombo
) {
  const component = tpl.component;
  const effectiveVs = compHelper.getEffectiveVariantSetting(tpl, variantCombo);
  const activeComponentVariants = getTplComponentActiveVariantsByVs(
    tpl,
    effectiveVs
  );
  const activeGlobalVariants = getGlobalVariants(variantCombo);
  return getComponentDefaultSize(component, [
    ...activeComponentVariants,
    ...activeGlobalVariants,
  ]);
}

/**
 * Returns the default TplComponent size when the argument `activeVariants`
 * are active.  These variants can be any combination of component or
 * global variants, and so the size may be affected by multiple
 * VariantSettings in the TplComponent.
 *
 * When these `activeVariants` are active, a subset of `tpl.vsettings`
 * will be active, and their args will turn on certain variants of
 * `tpl.component`.  We want to see what default size corresponds to
 * those variants of `tpl.component`.
 */
export function getTplComponentDefaultSizeByActiveVariants(
  tpl: TplComponent,
  activeVariants: Variant[]
) {
  const component = tpl.component;
  const activeComponentVariants = getTplComponentActiveVariantsByVs(
    tpl,
    getEffectiveVariantSetting(tpl, activeVariants)
  );
  const activeGlobalVariants = getGlobalVariants(activeVariants);
  return getComponentDefaultSize(component, [
    ...activeComponentVariants,
    ...activeGlobalVariants,
  ]);
}

export function getFrameComponentDefaultSize(
  vtm: VariantTplMgr,
  component: Component
) {
  return getComponentDefaultSize(component, vtm.getRootVariantCombo());
}

export function isStretchyComponent(
  component: Component,
  variants: Variant[] = []
) {
  variants = ensureValidCombo(component, variants);

  const size = getComponentDefaultSize(component, variants);

  const isStretchy = (val?: string) =>
    !!val &&
    [
      "stretch",
      CONTENT_LAYOUT_FULL_BLEED,
      CONTENT_LAYOUT_WIDE,
      "100vw",
      "100vh",
    ].includes(val);
  return isStretchy(size.width) || isStretchy(size.minWidth);
}

/**
 * Returns default width/height of the argument Component with the argument
 * Variants are active.  activeVariants can be any legal combination of
 * component and global variants.  Returned values will either be
 * stretch, wrap, or a numeric size.
 */
function getComponentDefaultSize_(
  component: Component,
  // activeVariants are either variants of Component or global variants
  activeVariants: Variant[]
) {
  const root = component.tplTree;
  if (!isTplVariantable(root)) {
    return { width: undefined, height: undefined };
  }

  const exp = getEffectiveVariantSetting(root, activeVariants).rsh();

  const size = {
    width: exp.get("width"),
    height: exp.get("height"),
    minWidth: exp.get("minWidth"),
    minHeight: exp.get("minHeight"),
  } as {
    width?: string;
    height?: string;
    minWidth?: string;
    minHeight?: string;
  };
  if (
    isTplComponent(root) &&
    (size.width === "default" || size.height === "default")
  ) {
    // The root node of this Component is itself a TplComponent using default
    // sizes.  So we need to recurse and figure out what sizes that default
    // size actually resolve to.
    const innerDefaultSize = getTplComponentDefaultSizeByActiveVariants(
      root,
      // activeVariants contains variants that belong to the argument `component`,
      // _not_ `root.component`.
      activeVariants
    );
    if (size.width === "default") {
      size.width = innerDefaultSize.width;
    }
    if (!size.minWidth) {
      size.minWidth = innerDefaultSize.minWidth;
    }
    if (size.height === "default") {
      size.height = innerDefaultSize.height;
    }
    if (!size.minHeight) {
      size.minHeight = innerDefaultSize.minHeight;
    }
  }
  return size;
}

export const getComponentDefaultSize = keyedComputedFn(
  getComponentDefaultSize_,
  {
    keyFn: (comp, activeVariants) =>
      `${comp.uuid}-${activeVariants
        .map((v) => v.uuid)
        .sort()
        .join("-")}`,
  }
);

// export const getComponentDefaultSize = getComponentDefaultSize_;

export function getParentExp(
  ctx: ComponentGenHelper,
  tpl: TplNode,
  variantCombo: VariantCombo
) {
  const parent = ctx.layoutParent(tpl, false);
  if (isKnownTplTag(parent)) {
    return ctx.getEffectiveVariantSetting(parent, variantCombo).rsh();
  }
  return undefined;
}

export function isTplComponentResizable(
  tpl: TplComponent,
  variantCombo: VariantCombo
) {
  // const sizes = getTplComponentDefaultSize(tpl, variantCombo);
  // const widthResizable = !sizes.width || !isExplicitSize(sizes.width);
  // const heightResizable = !sizes.height || !isExplicitSize(sizes.height);
  // return { width: widthResizable, height: heightResizable };

  // TODO: for now, we also allow TplComponent to always be resizable.  This
  // may change once we:
  // 1) consider letting Component author lock instance size, or
  // 2) deal with foreign components
  return { width: true, height: true };
}

export function isTplResizable(tpl: TplNode, vtm: VariantTplMgr) {
  if (isTplTag(tpl)) {
    if (isCodeComponentRoot(tpl) || isTplColumn(tpl)) {
      return { width: false, height: false };
    }
    // All other TplTags are resizable
    return { width: true, height: true };
  } else if (isTplComponent(tpl)) {
    return isTplComponentResizable(tpl, vtm.getTargetVariantComboForNode(tpl));
  } else {
    // Nothing else can carry size
    return { width: false, height: false };
  }
}

export function resetTplSize(
  tpl: TplNode,
  vtm: VariantTplMgr,
  prop?: "width" | "height"
) {
  const props = prop ? [prop] : ["width", "height"];
  if (!isTplResizable(tpl, vtm)) {
    return;
  }

  const exp = vtm.targetRshForNode(tpl as TplNode);
  if (isTplTag(tpl)) {
    for (const p of props) {
      exp.set(p, "wrap");
    }
  } else if (isTplComponent(tpl)) {
    for (const p of props) {
      exp.set(p, "default");
    }
  }
}

export function isTplDefaultSized(
  tpl: TplNode,
  vtm: VariantTplMgr,
  prop?: "width" | "height"
) {
  const props = prop ? [prop] : ["width", "height"];
  if (!isTplResizable(tpl, vtm)) {
    return true;
  }

  const exp = vtm.effectiveTargetVariantSetting(tpl as TplNode).rsh();
  if (isTplTag(tpl)) {
    return props.every(
      (p) => !exp.has(p) || exp.get(p) === "wrap" || exp.get(p) === "auto"
    );
  } else if (isTplComponent(tpl)) {
    return props.every((p) => !exp.has(p) || exp.get(p) === "default");
  }

  return true;
}

export function isTplAutoSizable(
  tpl: TplNode,
  vtm: VariantTplMgr,
  prop?: "width" | "height"
) {
  const props = prop ? [prop] : ["width", "height"];

  if (isTplTextBlock(tpl) || isTplImage(tpl)) {
    // Can always size text block and image to their natural size
    return true;
  }

  if (
    isTplTag(tpl) &&
    getRshContainerType(vtm.effectiveTargetVariantSetting(tpl).rsh()) ===
      ContainerLayoutType.free
  ) {
    // Cannot auto-size a free container
    return false;
  }

  const resizable = isTplResizable(tpl, vtm);
  return props.some((p) => resizable[p]);
}

export type PageSizeType = "fixed" | "stretch" | "wrap";

export function getPageFrameSizeType(pageFrame: ArenaFrame): PageSizeType {
  const activeVariants = getArenaFrameActiveVariants(pageFrame);
  const component = pageFrame.container.component;
  assert(isPageComponent(component), "Must be a PageComponent");
  return getPageComponentSizeType(component, activeVariants);
}

/**
 * PageComponent can be sized as either "fixed" or "stretch".  "fixed" means
 * it is fixed at the same height as the window, and "stretch" means
 * it is at least as tall as the window, but can grow taller.  The main
 * difference here is that you want "stretch" if you want to rely on document
 * body's scrolling, and "fixed" if you have internal scrollable containers
 * (for example, you have a fixed header at the top, fixed footer at the bottom,
 * and a scrollable container in the middle for content)
 *
 * We use height=100vh to represent "fixed", and height="stretch" to represent
 * "stretch".  This is convenient because 100vh is a valid value that does
 * result in a fixed viewport height, and "stretch" will be converted to 100%
 * (which will actually then be overridden by plasmic_page_wrapper css class).
 * It's also convenient because when converting between Page and normal
 * Components, these settings still make sense.
 */
export function getPageComponentSizeType(
  component: PageComponent,
  activeVariants: VariantCombo = []
) {
  const rootEffectiveVS = getEffectiveVariantSettingOfDeepRootElement(
    component,
    activeVariants
  );

  const exp = rootEffectiveVS?.rsh();
  const height = exp?.get("height");

  if (height === "100vh") {
    return "fixed";
  } else if (height === "wrap") {
    return "wrap";
  } else {
    return "stretch";
  }
}

export function setPageSizeType(
  component: PageComponent,
  sizeType: PageSizeType
) {
  assert(component.pageMeta, "Must be a PageComponent");
  const root = component.tplTree as TplNode;
  const exp = RSH(
    ensure(tryGetBaseVariantSetting(root), "Must have base VariantSetting").rs,
    root
  );
  exp.set("width", "stretch");
  if (sizeType === "fixed") {
    exp.set("height", "100vh");
    exp.set("overflow", "auto");
  } else if (sizeType === "wrap") {
    exp.set("height", "wrap");
  } else {
    exp.set("height", "stretch");
    exp.clear("overflow");
  }
}
