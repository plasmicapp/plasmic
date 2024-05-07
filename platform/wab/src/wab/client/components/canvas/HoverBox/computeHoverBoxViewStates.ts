import {
  ArenaFrame,
  isKnownArenaFrame,
  isKnownTplNode,
  TplNode,
} from "@/wab/classes";
import {
  ContainerChildAlignment,
  SpaceEdgeType,
} from "@/wab/client/components/canvas/HoverBox/draggable-edge";
import { recomputeBounds } from "@/wab/client/components/canvas/HoverBox/recomputeBounds";
import { isCodeComponentMissingPositionClass } from "@/wab/client/components/sidebar-tabs/Sections";
import { createNodeIcon } from "@/wab/client/components/sidebar-tabs/tpl-tree";
import { frameToScalerRect } from "@/wab/client/coords";
import { hasLayoutBox } from "@/wab/client/dom";
import { COMPONENT_ICON, PAGE_ICON } from "@/wab/client/icons";
import { computeNodeOutlineTagLayoutClass } from "@/wab/client/node-outline";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { summarizeFocusObj } from "@/wab/client/utils/tpl-client-utils";
import { asOne, assert, withoutNils } from "@/wab/common";
import { removeAllFromArray } from "@/wab/commons/collections";
import { isTokenRef } from "@/wab/commons/StyleToken";
import { isFrameComponent, isPageComponent } from "@/wab/components";
import { Box, Orient, Side } from "@/wab/geom";
import { Selectable } from "@/wab/selection";
import {
  FrameViewMode,
  getFrameHeight,
  isHeightAutoDerived,
} from "@/wab/shared/Arenas";
import { makeTokenRefResolver } from "@/wab/shared/cached-selectors";
import { NumericSize, tryParseNumericSize } from "@/wab/shared/Css";
import {
  computeDefinedIndicator,
  DefinedIndicatorType,
  getTargetBlockingCombo,
} from "@/wab/shared/defined-indicator";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import { ReadonlyIRuleSetHelpersX } from "@/wab/shared/RuleSetHelpers";
import { isExplicitSize, isTplDefaultSized } from "@/wab/shared/sizingutils";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { SlotSelection } from "@/wab/slots";
import {
  isTplColumn,
  isTplComponent,
  isTplImage,
  isTplInput,
  isTplTagOrComponent,
  isTplVariantable,
} from "@/wab/tpls";
import { ValComponent, ValNode, ValSlot } from "@/wab/val-nodes";
import { uniq } from "lodash";
import * as React from "react";

export interface HoverBoxViewDisplayProps {
  // These should always match the size of the selected element and not the size
  // of the desired HoverBox.  HoverBoxView will calculate its own size by
  // itself (using CSS).
  width: number;
  height: number;
  position: string;
  top: number;
  left: number;
  tagPosClasses: Array<string>;
  tagName: string;
  tagUid?: number;
  tagIcon?: React.ReactNode;
  autoWidth?: boolean;
  autoHeight?: boolean;
  padding?: Record<Side, NumericSize | undefined>;
  paddingPx?: Record<Side, number>;
  margin?: Record<Side, NumericSize | undefined>;
  marginPx?: Record<Side, number>;
  edgeControls: Record<Side, SpaceEdgeType[]>;
  containerChildAlignment: Record<Orient, ContainerChildAlignment | undefined>;
  isSlot?: boolean;
  isRepeated?: boolean;
}

export interface HoverBoxViewProps {
  display: string;
  displayProps?: HoverBoxViewDisplayProps;
  focusedElt?: JQuery<HTMLElement>;
}

export function getControlledSpacingObj(
  controlledObj: ArenaFrame | Selectable | undefined,
  viewCtx: ViewCtx
) {
  if (controlledObj instanceof SlotSelection) {
    return undefined;
  } else if (isKnownArenaFrame(controlledObj)) {
    if (controlledObj.viewMode === FrameViewMode.Stretch) {
      return viewCtx.valState().maybeValUserRoot();
    } else {
      return undefined;
    }
  } else {
    return controlledObj;
  }
}

export function computeHoverBoxTargets(studioCtx: StudioCtx): HoverBoxTarget[] {
  const focusObjs = studioCtx.hoverBoxControlledObjs ?? [];

  if (focusObjs.length === 1 && isKnownArenaFrame(focusObjs[0])) {
    const frame = focusObjs[0];
    const vc = studioCtx.tryGetViewCtxForFrame(frame);
    if (!vc || vc.isDisposed) {
      return [];
    }

    return [frame];
  }

  const vc = studioCtx.focusedViewCtx();

  if (!vc || vc.isDisposed) {
    return [];
  }

  const $canvasViewport = vc.canvasCtx.$viewport();

  if (!$canvasViewport) {
    return [];
  }

  const nodes = vc.focusedDomElts();
  assert(
    nodes.length === focusObjs.length,
    "focusedDomElts and focusedSelectables should have same length."
  );

  return nodes.map((node, i) => ({
    node,
    focusObj: focusObjs[i] as Selectable,
  }));
}

export type HoverBoxTarget =
  | ArenaFrame
  | { node: JQuery<HTMLElement> | null; focusObj: Selectable };

export function computeHoverBoxViewState(vc: ViewCtx, target: HoverBoxTarget) {
  const studioCtx = vc.studioCtx;
  if (isKnownArenaFrame(target)) {
    const scalerRect = studioCtx.getArenaFrameScalerRect(target);
    const component = target.container.component;
    if (!scalerRect) {
      // Frame hasn't been rendered yet
      return {
        display: "none",
      };
    }
    return {
      display: "unset",
      displayProps: {
        position: "absolute",
        width: target.width,
        height: getFrameHeight(target),
        top: scalerRect.top,
        left: scalerRect.left,
        tagPosClasses: [],
        tagUid: target.uid,
        tagName: studioCtx.tplMgr().describeArenaFrame(target),
        tagIcon: isFrameComponent(component)
          ? undefined
          : isPageComponent(component)
          ? PAGE_ICON
          : COMPONENT_ICON,
        ...computeSpacingViewState(target, vc),
      },
    };
  }

  const { node, focusObj } = target;

  if (node == null || node[0] == null || !hasLayoutBox(node[0]) || !focusObj) {
    return { display: "none" };
  }

  // Hide if no vc is selected, or if we are dragging the object (not the
  // HoverBox label).
  if (studioCtx.isDraggingObject() || studioCtx.isTransformingObject()) {
    return { display: "none" };
  }

  const boxInFrame = recomputeBounds(node);
  const boxInScaler = Box.fromRect(frameToScalerRect(boxInFrame.rect(), vc));

  const tplOrSlot = focusObj instanceof ValNode ? focusObj.tpl : focusObj;
  const tpl = isKnownTplNode(tplOrSlot) ? tplOrSlot : undefined;

  const effectiveVariantSetting = isTplTagOrComponent(tplOrSlot)
    ? vc.effectiveCurrentVariantSetting(tplOrSlot)
    : undefined;

  return {
    display: "unset",
    displayProps: {
      position: "absolute",
      ...boxInScaler.posRect(),
      tagPosClasses: computeNodeOutlineTagLayoutClass(
        vc.canvasCtx.$doc(),
        boxInFrame.posRect()
      ),
      isRepeated: !!effectiveVariantSetting?.dataRep,
      tagName: summarizeFocusObj(focusObj, vc, effectiveVariantSetting),
      tagIcon: createNodeIcon(tplOrSlot, effectiveVariantSetting),
      tagUid: tpl?.uid,
      ...computeSpacingViewState(focusObj, vc),
    },
    focusedElt: node,
  };
}

function computeSpacingViewState(
  controlledObj: ArenaFrame | Selectable,
  viewCtx: ViewCtx
): Pick<
  HoverBoxViewDisplayProps,
  | "padding"
  | "paddingPx"
  | "margin"
  | "marginPx"
  | "edgeControls"
  | "containerChildAlignment"
  | "autoWidth"
  | "autoHeight"
  | "isSlot"
> {
  const unknown = (isSlot: boolean) => ({
    edgeControls: {
      top: [],
      right: [],
      bottom: [],
      left: [],
    },
    containerChildAlignment: {
      vert: undefined,
      horiz: undefined,
    },
    isSlot: isSlot,
  });

  if (controlledObj instanceof SlotSelection) {
    return unknown(true);
  }

  const spacingObj = getControlledSpacingObj(controlledObj, viewCtx);
  const tpl = spacingObj?.tpl;
  const vtm = viewCtx.variantTplMgr();
  const effectiveVs =
    !tpl || !isTplVariantable(tpl)
      ? undefined
      : vtm.effectiveVariantSetting(tpl);
  const effectiveExpr = effectiveVs ? effectiveVs.rsh() : undefined;

  const parentExpr = tpl
    ? maybeEffectiveExpr(vtm, $$$(tpl).layoutParent().maybeOneTpl())
    : undefined;

  if (isKnownArenaFrame(controlledObj)) {
    const autoHeight = isHeightAutoDerived(controlledObj);
    return {
      autoWidth: false,
      autoHeight,
      edgeControls: {
        top: withoutNils([
          autoHeight ? undefined : "size",
          spacingObj ? "padding" : undefined,
        ]),
        right: withoutNils(["size", spacingObj ? "padding" : undefined]),
        bottom: withoutNils([
          autoHeight ? undefined : "size",
          spacingObj ? "padding" : undefined,
        ]),
        left: withoutNils(["size", spacingObj ? "padding" : undefined]),
      },
      containerChildAlignment: {
        vert: undefined,
        horiz: undefined,
      },
      ...(spacingObj && computeSpacingInfo(viewCtx, spacingObj, effectiveExpr)),
    };
  }

  if (!spacingObj || !tpl) {
    return unknown(false);
  }

  return {
    autoWidth: isTplDefaultSized(tpl, vtm, "width"),
    autoHeight: isTplDefaultSized(tpl, vtm, "height"),
    edgeControls: computeAllowedEdgeControls(
      viewCtx,
      spacingObj,
      effectiveVs,
      parentExpr
    ),
    containerChildAlignment: computeContainerChildAlignment(
      effectiveExpr,
      parentExpr
    ),
    isSlot: controlledObj instanceof ValSlot,
    ...computeSpacingInfo(viewCtx, spacingObj, effectiveExpr),
  };
}

function computeSpacingInfo(
  viewCtx: ViewCtx,
  valNode: ValNode,
  effectiveExpr: ReadonlyIRuleSetHelpersX | undefined
): Pick<
  HoverBoxViewDisplayProps,
  "padding" | "paddingPx" | "margin" | "marginPx"
> {
  const elt = asOne(viewCtx.renderState.sel2dom(valNode, viewCtx.canvasCtx));
  if (!elt || !effectiveExpr) {
    return {};
  }
  const sty = getComputedStyle(elt);
  const tokenRefResolver = makeTokenRefResolver(viewCtx.site);
  const getMaybeNumericSize = (prop: string) => {
    const val = effectiveExpr.get(prop);
    const resolvedVal = tokenRefResolver(val);
    const finalVal = resolvedVal ?? val;
    return finalVal ? tryParseNumericSize(finalVal) : undefined;
  };
  const getMarginPxSize = (side: Side) => {
    if (effectiveExpr!.has(`margin-${side}`)) {
      const size = getMaybeNumericSize(`margin-${side}`);
      if (!size) {
        return 0;
      }
      if (size.unit === "px") {
        return size.num;
      }
      // if the unit is something other than px, then we can't easily figure out
      // what the pixel size is (for example, 2em, 33%, 85vw).  We can't just
      // read off of sty.marginX, because the margin there may be applied via
      // parent container's flex gap.  So we just draw 0 for now.  This will
      // look a bit broken, but at least non-pixel margins should be hopefully
      // relatvely rare.
      return 0;
    } else {
      return 0;
    }
  };

  return {
    padding: {
      left: getMaybeNumericSize("padding-left"),
      top: getMaybeNumericSize("padding-top"),
      bottom: getMaybeNumericSize("padding-bottom"),
      right: getMaybeNumericSize("padding-right"),
    },
    margin: {
      left: getMaybeNumericSize("margin-left"),
      top: getMaybeNumericSize("margin-top"),
      bottom: getMaybeNumericSize("margin-bottom"),
      right: getMaybeNumericSize("margin-right"),
    },
    paddingPx: {
      left: tryParseNumericSize(sty.paddingLeft)?.num ?? 0,
      right: tryParseNumericSize(sty.paddingRight)?.num ?? 0,
      top: tryParseNumericSize(sty.paddingTop)?.num ?? 0,
      bottom: tryParseNumericSize(sty.paddingBottom)?.num ?? 0,
    },
    marginPx: {
      left: getMarginPxSize("left"),
      right: getMarginPxSize("right"),
      top: getMarginPxSize("top"),
      bottom: getMarginPxSize("bottom"),
    },
  };
}

function maybeEffectiveExpr(vtm: VariantTplMgr, tpl: TplNode | undefined) {
  if (!tpl || !isTplVariantable(tpl)) {
    return undefined;
  }
  return vtm.effectiveVariantSetting(tpl).rsh();
}

function computeContainerChildAlignment(
  effectiveExpr: ReadonlyIRuleSetHelpersX | undefined,
  parentExpr: ReadonlyIRuleSetHelpersX | undefined
): Record<Orient, ContainerChildAlignment | undefined> {
  const unknown = () => ({
    vert: undefined,
    horiz: undefined,
  });

  if (!parentExpr) {
    return unknown();
  }

  if (!effectiveExpr) {
    return unknown();
  }

  const normAlign = (val: string) => {
    return val === "flex-start"
      ? "start"
      : val === "flex-end"
      ? "end"
      : undefined;
  };

  const parentContainerType = getRshContainerType(parentExpr);
  if (parentContainerType === ContainerLayoutType.flexColumn) {
    const vertAlign = parentExpr.get("justify-content");
    const horizAlign =
      effectiveExpr.getRaw("align-self") ?? parentExpr.get("align-items");
    return {
      vert: vertAlign === "flex-end" ? "end" : "start",
      horiz: normAlign(horizAlign),
    };
  } else if (parentContainerType === ContainerLayoutType.flexRow) {
    const vertAlign =
      effectiveExpr.getRaw("align-self") ?? parentExpr.get("align-items");
    const horizAlign = parentExpr.get("justify-content");
    return {
      vert: normAlign(vertAlign),
      horiz: horizAlign === "flex-end" ? "end" : "start",
    };
  } else if (parentContainerType === ContainerLayoutType.contentLayout) {
    const vertAlign = parentExpr.get("align-content");
    const horizAlign =
      effectiveExpr.getRaw("justify-self") ?? parentExpr.get("justify-items");
    return {
      vert: vertAlign === "flex-end" ? "end" : "start",
      horiz: normAlign(horizAlign),
    };
  } else {
    return unknown();
  }
}

function computeAllowedEdgeControls(
  viewCtx: ViewCtx,
  spacingObj: ValNode,
  effectiveVs: EffectiveVariantSetting | undefined,
  parentExpr: ReadonlyIRuleSetHelpersX | undefined
): Record<Side, SpaceEdgeType[]> {
  const tpl = spacingObj.tpl;

  if (
    spacingObj instanceof ValComponent &&
    isCodeComponentMissingPositionClass(viewCtx, spacingObj)
  ) {
    return {
      top: [],
      right: [],
      bottom: [],
      left: [],
    };
  }

  const definedIndicator = (prop: string): DefinedIndicatorType => {
    if (isTplVariantable(tpl)) {
      return computeDefinedIndicator(
        viewCtx.site,
        viewCtx.currentComponent(),
        effectiveVs?.getPropSource(prop),
        viewCtx.variantTplMgr().getTargetIndicatorComboForNode(tpl)
      );
    } else {
      return { source: "none" };
    }
  };

  if (isTplColumn(tpl)) {
    return {
      top: getTargetBlockingCombo([definedIndicator("padding-top")])
        ? []
        : ["padding"],
      right: getTargetBlockingCombo([definedIndicator("padding-right")])
        ? []
        : ["padding"],
      bottom: getTargetBlockingCombo([definedIndicator("padding-bottom")])
        ? []
        : ["padding"],
      left: getTargetBlockingCombo([definedIndicator("padding-left")])
        ? []
        : ["padding"],
    };
  }

  const parentContainerType = parentExpr
    ? getRshContainerType(parentExpr)
    : undefined;
  const top: SpaceEdgeType[] = [];
  const right: SpaceEdgeType[] = [];
  const bottom: SpaceEdgeType[] = [];
  const left: SpaceEdgeType[] = [];
  if (parentContainerType === ContainerLayoutType.flexColumn) {
    top.push("padding", "margin");
    right.push("padding", "size");
    bottom.push("padding", "margin");
    left.push("padding", "size");
  } else if (parentContainerType === ContainerLayoutType.flexRow) {
    top.push("padding", "size");
    right.push("padding", "margin");
    bottom.push("padding", "size");
    left.push("padding", "margin");
  } else if (parentContainerType === ContainerLayoutType.grid) {
    top.push("padding");
    right.push("padding");
    bottom.push("padding");
    left.push("padding");
  } else if (parentContainerType === ContainerLayoutType.free) {
    top.push("padding", "size");
    right.push("padding", "size");
    bottom.push("padding", "size");
    left.push("padding", "size");
  } else {
    top.push("padding", "size");
    right.push("padding", "size");
    bottom.push("padding", "size");
    left.push("padding", "size");
  }

  const sides = {
    top: top,
    right: right,
    bottom: bottom,
    left: left,
  };

  if (isTplVariantable(tpl)) {
    for (const side in sides) {
      ["margin", "padding"].forEach((spacing) => {
        if (getTargetBlockingCombo([definedIndicator(`${spacing}-${side}`)])) {
          removeAllFromArray(sides[side as Side], spacing);
        }
      });
    }
  }

  const effectiveExpr = effectiveVs ? effectiveVs.rsh() : undefined;
  if (effectiveExpr) {
    const widthVal = effectiveExpr.get("width");
    const heightVal = effectiveExpr.get("height");
    if (isExplicitSize(widthVal) || isTokenRef(widthVal)) {
      right.push("size");
      left.push("size");
    }
    if (isExplicitSize(heightVal) || isTokenRef(heightVal)) {
      top.push("size");
      bottom.push("size");
    }

    for (const side in sides) {
      ["margin", "padding"].forEach((spacing) => {
        const spacingVal = effectiveExpr.get(`${spacing}-${side}`);
        if (isExplicitSize(spacingVal) || isTokenRef(spacingVal)) {
          sides[side].push(spacing);
        }
      });
    }
  }

  if (isTplComponent(tpl)) {
    removeAllFromArray(top, "padding");
    removeAllFromArray(right, "padding");
    removeAllFromArray(bottom, "padding");
    removeAllFromArray(left, "padding");
    top.push("size");
    right.push("size");
    bottom.push("size");
    left.push("size");
  }
  if (isTplImage(tpl)) {
    removeAllFromArray(top, "padding");
    removeAllFromArray(right, "padding");
    removeAllFromArray(bottom, "padding");
    removeAllFromArray(left, "padding");
    top.push("size");
    right.push("size");
    bottom.push("size");
    left.push("size");
  }
  if (isTplInput(tpl)) {
    // always allow sizing for inputs
    top.push("size");
    right.push("size");
    bottom.push("size");
    left.push("size");
  }

  return {
    top: uniq(top),
    right: uniq(right),
    bottom: uniq(bottom),
    left: uniq(left),
  };
}
