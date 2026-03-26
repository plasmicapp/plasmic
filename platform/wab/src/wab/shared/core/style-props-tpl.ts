import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { isTypographyNode } from "@/wab/shared/SlotUtils";
import { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
import {
  FLEX_CONTAINER_PROPS,
  GAP_PROPS,
  POSITIONING_PROPS,
  TRANSFORM_PROPS,
  gridChildProps,
  gridCssProps,
  imageCssProps,
  isValidStyleProp,
  listStyleCssProps,
  sizeSectionProps,
  spacingSectionProps,
  transitionProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import * as Tpls from "@/wab/shared/core/tpls";
import { isGridTag } from "@/wab/shared/grid-utils";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import {
  TplComponent,
  TplNode,
  TplTag,
  VariantSetting,
} from "@/wab/shared/model/classes";

/**
 * Same as {@link isValidStyleProp} but checks validity for the given tpl.
 *
 * TODO: Replace manual checks around the codebase with this function.
 */
export function isValidStylePropForTpl(
  prop: string,
  tpl: TplNode,
  vs: VariantSetting,
  ccRegistry: CodeComponentsRegistry
): boolean {
  if (!isValidStyleProp(prop)) {
    return false;
  }

  if (typographyCssProps.includes(prop)) {
    return isTypographyValidForTpl(tpl);
  }

  if (spacingSectionProps.includes(prop)) {
    if (prop.startsWith("padding")) {
      return isPaddingValidForTpl(tpl as TplTag | TplComponent, ccRegistry);
    }
    if (prop.startsWith("margin")) {
      return isMarginValidForTpl(tpl as TplTag | TplComponent);
    }
    return false;
  }

  if (transitionProps.includes(prop)) {
    return isTransitionValidForTpl(tpl);
  }

  if (sizeSectionProps.includes(prop)) {
    return isSizeValidForTpl(tpl);
  }

  if (POSITIONING_PROPS.includes(prop)) {
    return isPositioningValidForTpl(tpl, vs);
  }

  if (
    FLEX_CONTAINER_PROPS.includes(prop) ||
    GAP_PROPS.includes(prop) ||
    gridCssProps.includes(prop)
  ) {
    const isContainerOrCodeComponentTpl =
      Tpls.isTplContainer(tpl) || Tpls.isTplCodeComponent(tpl);
    if (!isContainerOrCodeComponentTpl) {
      return false;
    }

    if (FLEX_CONTAINER_PROPS.includes(prop)) {
      return isFlexContainerPropValidForTpl(tpl, vs);
    }

    if (gridCssProps.includes(prop)) {
      return isGridContainerPropValidForTpl(tpl, vs);
    }

    if (GAP_PROPS.includes(prop)) {
      return isGapPropValidForTpl(prop, tpl, vs);
    }

    return false;
  }

  if (gridChildProps.includes(prop)) {
    return Boolean(
      Tpls.isTplVariantable(tpl) && tpl.parent && isGridTag(tpl.parent)
    );
  }

  if (TRANSFORM_PROPS.includes(prop)) {
    return isTransformValidForTpl(tpl);
  }

  if (
    prop.startsWith("border") ||
    [
      "box-shadow",
      "filter",
      "backdrop-filter",
      "mix-blend-mode",
      "cursor",
      "pointer-events",
    ].includes(prop)
  ) {
    return Tpls.isTplTag(tpl) || Tpls.isTplCodeComponent(tpl);
  }

  if (prop === "background") {
    return isBackgroundValidForTpl(tpl);
  }

  if (prop === "opacity" || prop === "visibility") {
    if (Tpls.isTplCodeComponent(tpl)) {
      return isStyleSectionEnabled(
        ccRegistry,
        tpl,
        PublicStyleSection.Visibility
      );
    }
    return Tpls.isTplTag(tpl) || Tpls.isTplComponent(tpl);
  }

  if (prop.startsWith("overflow")) {
    return isOverflowValidForTpl(tpl);
  }

  if (listStyleCssProps.includes(prop)) {
    return isListStyleValidForTpl(tpl);
  }

  if (imageCssProps.includes(prop)) {
    return Tpls.isTplImage(tpl);
  }

  return false;
}

export function isTypographyValidForTpl(tpl: TplNode): boolean {
  const isTypographyTpl = isTypographyNode(tpl);
  const isContainer = Tpls.isTplContainer(tpl) || Tpls.isTplCodeComponent(tpl);
  const isIcon = Tpls.isTplIcon(tpl);
  return (isTypographyTpl || isContainer) && !isIcon;
}

export function isSizeValidForTpl(tpl: TplNode): boolean {
  const hasSize = Tpls.isSizable(tpl);
  const isTag = Tpls.isTplTag(tpl);
  const isComponent = Tpls.isTplComponent(tpl);
  const isColumn = Tpls.isTplColumn(tpl);
  return hasSize && (isTag || isComponent) && !isColumn;
}

export function isPositioningValidForTpl(
  tpl: TplNode,
  vs: VariantSetting
): boolean {
  const isTag = Tpls.isTplTag(tpl);
  const isComponent = Tpls.isTplComponent(tpl);
  const isRoot = Tpls.isComponentRoot(tpl);
  const isColumn = Tpls.isTplColumn(tpl);

  return (
    (isTag || isComponent) &&
    (!isRoot || !!vs.rs.values["position"]) &&
    !isColumn &&
    !Tpls.isTplTextBlock(tpl.parent)
  );
}

export function isTransitionValidForTpl(tpl: TplNode): boolean {
  const isSlot = Tpls.isTplSlot(tpl);
  const isComponent = Tpls.isTplComponent(tpl);
  const isCodeComponentTpl = Tpls.isTplCodeComponent(tpl);
  const isTag = Tpls.isTplTag(tpl);

  return (
    (isSlot || isComponent || isCodeComponentTpl || isTag) &&
    Tpls.isTplVariantable(tpl)
  );
}

export function isBackgroundValidForTpl(tpl: TplNode): boolean {
  const isTag = Tpls.isTplTag(tpl);
  const isCodeComponentTpl = Tpls.isTplCodeComponent(tpl);
  return (isTag || isCodeComponentTpl) && !Tpls.isTplImage(tpl);
}

export function isOverflowValidForTpl(tpl: TplNode): boolean {
  const isContainer = Tpls.isTplContainer(tpl);
  const isColumns = Tpls.isTplColumns(tpl);
  const isColumn = Tpls.isTplColumn(tpl);
  const isCodeComponentTpl = Tpls.isTplCodeComponent(tpl);

  return isContainer || isColumns || isColumn || isCodeComponentTpl;
}

export function isListStyleValidForTpl(tpl: TplNode): boolean {
  const isTag = Tpls.isTplTag(tpl);
  return isTag && isTagListContainer((tpl as TplTag).tag);
}

export function isTransformValidForTpl(tpl: TplNode): boolean {
  const isTag = Tpls.isTplTag(tpl);
  const isComponent = Tpls.isTplComponent(tpl);
  const isCodeComponentTpl = Tpls.isTplCodeComponent(tpl);
  return isTag || isComponent || isCodeComponentTpl;
}

export function isFlexContainerPropValidForTpl(
  tpl: TplNode,
  vs: VariantSetting
): boolean {
  const rsh = RSH(vs.rs, tpl);
  const containerType = getRshContainerType(rsh);

  return (
    containerType === ContainerLayoutType.flexRow ||
    containerType === ContainerLayoutType.flexColumn
  );
}

export function isGridContainerPropValidForTpl(
  tpl: TplNode,
  vs: VariantSetting
): boolean {
  const rsh = RSH(vs.rs, tpl);
  const containerType = getRshContainerType(rsh);

  return containerType === ContainerLayoutType.grid;
}

export function isGapPropValidForTpl(
  prop: string,
  tpl: TplNode,
  vs: VariantSetting
): boolean {
  const rsh = RSH(vs.rs, tpl);
  const containerType = getRshContainerType(rsh);

  const isFlexRow = containerType === ContainerLayoutType.flexRow;
  const isFlexColumn = containerType === ContainerLayoutType.flexColumn;
  const isGrid = containerType === ContainerLayoutType.grid;
  const isWrap = rsh.get("flex-wrap")?.startsWith("wrap") ?? false;

  if (prop === "column-gap") {
    return isFlexRow || isWrap || isGrid;
  }

  if (prop === "row-gap") {
    return isFlexColumn || isWrap || isGrid;
  }

  return false;
}

export function isPaddingValidForTpl(
  tpl: TplTag | TplComponent,
  ccRegistry: CodeComponentsRegistry
): boolean {
  if (Tpls.isTplComponent(tpl)) {
    if (Tpls.isTplCodeComponent(tpl)) {
      return isStyleSectionEnabled(ccRegistry, tpl, PublicStyleSection.Spacing);
    } else {
      return false;
    }
  } else {
    return !["img", "svg"].includes(tpl.tag);
  }
}

export function isMarginValidForTpl(tpl: TplTag | TplComponent): boolean {
  return !Tpls.isComponentRoot(tpl) && !Tpls.isTplColumn(tpl);
}

function isStyleSectionEnabled(
  ccRegistry: CodeComponentsRegistry,
  tpl: TplComponent,
  section: PublicStyleSection
): boolean {
  const styleSections = ccRegistry
    .getRegisteredCodeComponentsMap()
    .get(tpl.component.name)?.meta.styleSections;
  if (styleSections === false) {
    return false;
  }
  if (Array.isArray(styleSections)) {
    return (styleSections as PublicStyleSection[]).includes(section);
  }
  return true;
}
