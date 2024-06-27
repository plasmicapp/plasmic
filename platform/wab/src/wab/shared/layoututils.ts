import { unexpected } from "@/wab/shared/common";
import { isMixinPropRef, isTokenRef } from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import { parseCssNumericNew } from "@/wab/shared/css";
import { createGridSpec, showGridCss } from "@/wab/shared/Grids";
import { HORIZ_CONTAINER_CAP, VERT_CONTAINER_CAP } from "@/wab/shared/Labels";
import {
  IRuleSetHelpers,
  IRuleSetHelpersX,
  RSH,
  ReadonlyIRuleSetHelpers,
  ReadonlyIRuleSetHelpersX,
} from "@/wab/shared/RuleSetHelpers";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import {
  CONTENT_LAYOUT,
  FAKE_FLEX_CONTAINER_PROPS,
  GAP_PROPS,
  contentLayoutProps,
  gridCssProps,
} from "@/wab/shared/core/style-props";
import { CONTENT_LAYOUT_INITIALS } from "@/wab/shared/default-styles";
import {
  RuleSet,
  TplNode,
  TplTag,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { getTplTagRoot, isTplComponent, isTplVariantable } from "@/wab/shared/core/tpls";

export type ContainerType =
  | "free"
  | "flex-row"
  | "flex-column"
  | "grid"
  | "content-layout";

export function ensureContainerType(x: string): ContainerType {
  return x === "free" ||
    x === "flex-row" ||
    x === "flex-column" ||
    x === "grid" ||
    x === "content-layout"
    ? x
    : unexpected();
}

export function convertSelfContainerType(
  targetExp: IRuleSetHelpersX,
  type: ContainerType,
  baseRsh?: IRuleSetHelpersX
) {
  const prevType = getRshContainerType(targetExp);
  if (prevType === type && targetExp.has("display")) {
    return false;
  }

  const rsh = targetExp;

  if (prevType === ContainerLayoutType.grid) {
    rsh.clearAll(gridCssProps);
  } else if (prevType === ContainerLayoutType.contentLayout) {
    rsh.clearAll(contentLayoutProps);
  } else if (prevType.includes("flex") && !type.includes("flex")) {
    rsh.clearAll([...FAKE_FLEX_CONTAINER_PROPS, ...GAP_PROPS]);
  }

  if (type === "grid") {
    rsh.set("display", "grid");
    rsh.merge(showGridCss(createGridSpec()));
  } else if (type.includes("flex")) {
    rsh.set("display", "flex");
    rsh.set("flex-direction", type === "flex-row" ? "row" : "column");
    if (!rsh.has("flex-wrap") || rsh.get("flex-wrap") === "nowrap") {
      // If there's no wrapping, then transfer row-gap to column-gap and vice versa
      const flexRowGap =
        rsh.getRaw("flex-row-gap") || baseRsh?.getRaw("flex-row-gap");
      const flexColumnGap =
        rsh.getRaw("flex-column-gap") || baseRsh?.getRaw("flex-column-gap");
      if (type === "flex-row" && flexRowGap) {
        rsh.set("flex-column-gap", flexRowGap);
        rsh.clear("flex-row-gap");
      } else if (type === "flex-column" && flexColumnGap) {
        rsh.set("flex-row-gap", flexColumnGap);
        rsh.clear("flex-column-gap");
      }
    }
  } else if (type === "free") {
    rsh.set("display", "block");
  } else if (type === "content-layout") {
    rsh.merge(CONTENT_LAYOUT_INITIALS);
  }
  return true;
}

export function getTplContainerType(
  tpl: TplTag,
  vs: VariantSetting
): ContainerType {
  const rsh = RSH(vs.rs, tpl);
  return getRshContainerType(rsh);
}

export enum ContainerLayoutType {
  flexColumn = "flex-column",
  flexRow = "flex-row",
  grid = "grid",
  free = "free",
  contentLayout = "content-layout",
}

export enum PositionLayoutType {
  free = "absolute",
  auto = "relative",
  sticky = "sticky",
  fixed = "fixed",
  static = "static",
}

export function getRshContainerType(
  rsh: ReadonlyIRuleSetHelpersX
): ContainerLayoutType {
  const display = rsh.get("display");
  const axis = flexDirToArrangement(rsh.get("flex-direction"));
  if (display === "flex") {
    return axis === "column"
      ? ContainerLayoutType.flexColumn
      : ContainerLayoutType.flexRow;
  } else if (display === "grid") {
    return ContainerLayoutType.grid;
  } else if (display === CONTENT_LAYOUT) {
    return ContainerLayoutType.contentLayout;
  } else {
    return ContainerLayoutType.free;
  }
}

export function isFlexContainerRsh(rsh: ReadonlyIRuleSetHelpersX): boolean {
  const containerType = getRshContainerType(rsh);
  return (
    containerType === ContainerLayoutType.flexColumn ||
    containerType === ContainerLayoutType.flexRow
  );
}

export function getContainerTypeName(type: ContainerType) {
  if (type === "free") {
    return "Free-floating";
  } else if (type === "flex-column") {
    return VERT_CONTAINER_CAP;
  } else if (type === "flex-row") {
    return HORIZ_CONTAINER_CAP;
  } else if (type === "grid") {
    return "Grid";
  } else if (type === "content-layout") {
    return "Document layout";
  } else {
    throw new Error("Unknown type");
  }
}

export function getRshPositionType(rsh: ReadonlyIRuleSetHelpers) {
  const position = rsh.get("position");
  if (position === "absolute") {
    return PositionLayoutType.free;
  } else if (position === "relative") {
    return PositionLayoutType.auto;
  } else if (position === "sticky") {
    return PositionLayoutType.sticky;
  } else if (position === "fixed") {
    return PositionLayoutType.fixed;
  } else if (position === "static") {
    return PositionLayoutType.static;
  } else {
    throw new Error(`Unknown position type ${position}`);
  }
}

export function isContainerTypeVariantable(
  type: ContainerLayoutType | ContainerType
) {
  if (
    type === ContainerLayoutType.contentLayout ||
    type === ContainerLayoutType.grid
  ) {
    return false;
  }
  return true;
}

export function convertToRelativePosition(
  effectiveExp: ReadonlyIRuleSetHelpersX,
  target: IRuleSetHelpers
) {
  // The default CSS value of position is "static", but we override it to
  // "relative" at read time.
  if (effectiveExp.get("position") !== "relative") {
    target.set("position", "relative");
  }
  for (const prop of ["left", "top", "bottom", "right"]) {
    if (effectiveExp.has(prop)) {
      target.set(prop, "auto");
    }
  }
}

export function convertToSlotContent(
  effectiveExp: ReadonlyIRuleSetHelpersX,
  target: IRuleSetHelpers
) {
  convertToRelativePosition(effectiveExp, target);
}

export function convertToAbsolutePosition(exp: IRuleSetHelpers) {
  if (exp.get("position") !== "absolute") {
    exp.set("position", "absolute");
    exp.set("left", "0");
    exp.set("top", "0");
    exp.set("bottom", "auto");
    exp.set("right", "auto");
  }
}

export function isFlexContainerWithGap(expr: ReadonlyIRuleSetHelpersX) {
  const container = getRshContainerType(expr);
  if (
    container === ContainerLayoutType.flexColumn ||
    container === ContainerLayoutType.flexRow
  ) {
    for (const prop of ["flex-column-gap", "flex-row-gap"] as const) {
      if (!!getNumericGap(expr, prop)) {
        return true;
      }
    }
  }
  return false;
}

export function getNumericGap(
  expr: ReadonlyIRuleSetHelpersX,
  prop: "flex-column-gap" | "flex-row-gap"
) {
  if (expr.has(prop)) {
    const val = expr.get(prop);
    if (isMixinPropRef(val)) {
      return val;
    }
    if (isTokenRef(val)) {
      return val;
    }
    const parsed = parseCssNumericNew(val);
    if (parsed) {
      return val;
    }
  }
  return undefined;
}

export function makeLayoutAwareRuleSet(
  rs: RuleSet,
  forBase: boolean
): DeepReadonly<RuleSet> {
  // Setting gap is tricky. For base, you may have flex-direction:row and
  // column-gap:10px.  Then for a non-base variant, you may have
  // flex-direction:column and row-gap:20px.  That means if you activate
  // that non-base variant, you'll end up with flex-direction:column and
  // BOTH row and column gap.  When you have flex-direction:column and a
  // column gap, it's usually no big deal, except if you have children
  // that have 100% width, in which case they will overflow the container
  // :-/  To prevent this, by default, we will set the cross-gap to
  // 0px whenever you set a gap in a non-base variant.
  //
  // Or, more specifically: if this RuleSet has an explicit flex-direction
  // set, or if it has one of the gaps, we will set the cross gap to be
  // 0px, to make sure that we don't end up with unintentional combinations
  // of both row and column gaps.
  if (forBase) {
    // We don't care about setting this for the base variant, because we
    // don't need to override any cross gap in the base.
    return rs;
  }
  return {
    ...rs,
    typeTag: rs.typeTag,
    get values() {
      const values = rs.values;
      const flexDir = values["flex-direction"];
      const flexWrap = values["flex-wrap"];
      const rowGap = values["flex-row-gap"];
      const colGap = values["flex-column-gap"];

      const isFlex = !!flexDir || !!rowGap || !!colGap;
      const isWrap = !!flexWrap && ["wrap", "wrap-reverse"].includes(flexWrap);

      let extraValues: Record<string, string> | undefined = undefined;
      if (isFlex && !isWrap && !(rowGap && colGap)) {
        const dir = flexDir && flexDirToArrangement(flexDir);
        const crossRule =
          dir === "column" || rowGap
            ? "flex-column-gap"
            : dir === "row" || colGap
            ? "flex-row-gap"
            : undefined;
        if (crossRule) {
          if (!extraValues) {
            extraValues = {};
          }
          extraValues[crossRule] = "0px";
        }
      }
      if (extraValues) {
        return { ...values, ...extraValues };
      } else {
        return values;
      }
    },
  };
}

export type FlexAxis = "row" | "column";

export function flexDirToArrangement(flexDir: string): FlexAxis {
  return flexDir.startsWith("row") ? "row" : "column";
}

export function isFlexReverse(flexDir: string) {
  return flexDir.endsWith("-reverse");
}

export function isContentLayoutTpl(tpl: TplNode, opts?: { deep?: boolean }) {
  if (!isTplVariantable(tpl)) {
    return false;
  }

  const baseVs = ensureBaseVariantSetting(tpl);
  if (baseVs.rs.values["display"] === CONTENT_LAYOUT) {
    return true;
  }

  if (opts?.deep && isTplComponent(tpl)) {
    const root = getTplTagRoot(tpl);
    if (root && isContentLayoutTpl(root)) {
      return true;
    }
  }
  return false;
}
