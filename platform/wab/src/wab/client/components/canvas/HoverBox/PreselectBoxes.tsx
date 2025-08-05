import { EditableNodeLabel } from "@/wab/client/components/canvas/EditableNodeLabel";
import styles from "@/wab/client/components/canvas/HoverBox/HoverBox.module.scss";
import { recomputeBounds } from "@/wab/client/components/canvas/HoverBox/recomputeBounds";
import { useTagLeftOffset } from "@/wab/client/components/canvas/HoverBox/useTagLeftOffset";
import { createNodeIcon } from "@/wab/client/components/sidebar-tabs/tpl-tree";
import {
  BASE_VARIANT_COLOR,
  NON_BASE_VARIANT_COLOR,
} from "@/wab/client/components/studio/GlobalCssVariables";
import { frameToScalerRect } from "@/wab/client/coords";
import { hasLayoutBox } from "@/wab/client/dom";
import { computeNodeOutlineTagLayoutClass } from "@/wab/client/node-outline";
import {
  cssPropsForInvertTransform,
  StudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { summarizeFocusObj } from "@/wab/client/utils/tpl-client-utils";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { maybe } from "@/wab/shared/common";
import {
  makeSelectableFullKey,
  Selectable,
  SQ,
} from "@/wab/shared/core/selection";
import { isTplTagOrComponent, isTplVariantable } from "@/wab/shared/core/tpls";
import cn from "classnames";
import $ from "jquery";
import { observer } from "mobx-react";
import React from "react";

export const PreselectBoxes = observer(PreselectBoxes_);
function PreselectBoxes_() {
  const studioCtx = useStudioCtx();

  if (studioCtx.isTransforming()) {
    return null;
  }

  const viewCtx = studioCtx.viewCtxs
    // read through all ViewCtx's hovered dom element so that we are
    // subscribed to any hover change.
    .filter((vc) => !!vc.$hoveredDomElt())
    .find((vc) =>
      getArenaFrames(studioCtx.currentArena).includes(vc.arenaFrame())
    );

  const hoveredSelectable = viewCtx?.hoveredSelectable();
  const cloneKey = hoveredSelectable
    ? viewCtx?.sel2cloneKey(hoveredSelectable)
    : undefined;
  const hoveredSQ =
    viewCtx && hoveredSelectable
      ? SQ(hoveredSelectable, viewCtx.valState())
      : undefined;
  const ancestorsSelectables = hoveredSQ?.ancestors().toArray() ?? [];

  const preselectBoxes = studioCtx.showAncestorsHoverBoxes()
    ? ancestorsSelectables.map((selectable) => (
        <PreselectBox
          key={makeSelectableFullKey(selectable)}
          selectable={selectable}
          cloneKey={cloneKey}
          studioCtx={studioCtx}
          viewCtx={viewCtx}
          isHoveredElt={hoveredSelectable === selectable}
        />
      ))
    : !!hoveredSelectable && (
        <PreselectBox
          selectable={hoveredSelectable}
          cloneKey={cloneKey}
          studioCtx={studioCtx}
          viewCtx={viewCtx}
          isHoveredElt={true}
        />
      );
  return <>{preselectBoxes}</>;
}

export const PreselectBox = observer(PreselectBox_);
function PreselectBox_(props: {
  selectable: Selectable;
  cloneKey: string | undefined;
  studioCtx: StudioCtx;
  viewCtx: ViewCtx | undefined;
  isHoveredElt: boolean;
}) {
  const { selectable, cloneKey, studioCtx, viewCtx, isHoveredElt } = props;

  const $element = maybe(
    viewCtx &&
      viewCtx.renderState.sel2dom(selectable, viewCtx.canvasCtx, cloneKey),
    (dom) => $(dom)
  );
  const $focused =
    viewCtx === studioCtx.focusedViewCtx() && viewCtx?.focusedDomElt();

  const shouldShow =
    viewCtx &&
    !studioCtx.shouldHidePreselectBox() &&
    $element?.length &&
    $element?.get(0).isConnected &&
    $element?.toArray().filter(hasLayoutBox)?.length > 0 &&
    (studioCtx.showStackOfParents || !$focused || !$element.is($focused));

  if (!shouldShow) {
    return null;
  }

  return (
    <PreselectBoxInner
      selectable={selectable}
      studioCtx={studioCtx}
      viewCtx={viewCtx}
      isHoveredElt={isHoveredElt}
      $element={$element}
      $focused={$focused}
    />
  );
}

function PreselectBoxInner(props: {
  selectable: Selectable;
  studioCtx: StudioCtx;
  viewCtx: ViewCtx;
  isHoveredElt: boolean;
  $element: JQuery | undefined;
  $focused: false | JQuery<HTMLElement> | null | undefined;
}) {
  const { selectable, studioCtx, viewCtx, isHoveredElt, $element, $focused } =
    props;

  const hoverTagRef = React.useRef<HTMLDivElement>(null);

  const tpl = selectable.tpl;

  const shouldShowHoverTag =
    isHoveredElt && $element && (!$focused || !$element.is($focused));

  const frameRect = recomputeBounds($element!).rect();
  const scalerRect = frameToScalerRect(frameRect, viewCtx);
  const cssProps = cssPropsForInvertTransform(studioCtx.zoom, scalerRect);

  const leftOffset = useTagLeftOffset(
    hoverTagRef,
    scalerRect.width,
    studioCtx.zoom
  );

  const isTargetingSomeNonBaseVariant =
    isTplVariantable(tpl) &&
    viewCtx.variantTplMgr().isTargetingNonBaseVariant(tpl);

  const effectiveVariantSetting =
    shouldShowHoverTag && isTplTagOrComponent(tpl)
      ? viewCtx.effectiveCurrentVariantSetting(tpl)
      : undefined;
  const boxInFrame = shouldShowHoverTag
    ? recomputeBounds($element!)
    : undefined;
  const tagName = shouldShowHoverTag
    ? summarizeFocusObj(selectable, viewCtx, effectiveVariantSetting)
    : undefined;
  const tagPosClasses =
    shouldShowHoverTag && boxInFrame
      ? computeNodeOutlineTagLayoutClass(
          viewCtx.canvasCtx.$doc(),
          boxInFrame.posRect()
        )
      : [];
  const tagIcon =
    shouldShowHoverTag && createNodeIcon(tpl!, effectiveVariantSetting);

  return (
    <div
      className={cn("PreselectBox", {
        [styles.hoveringParentStack]: studioCtx.showStackOfParents,
      })}
      data-original-width={scalerRect.width}
      data-original-height={scalerRect.height}
      style={{
        display: "block",
        ...scalerRect,
        ...cssProps,
      }}
    >
      <div
        className={styles.preselectBoxBorder}
        style={{
          borderColor: isTargetingSomeNonBaseVariant
            ? NON_BASE_VARIANT_COLOR
            : BASE_VARIANT_COLOR,
          ...(!isHoveredElt && {
            opacity: 0.1,
            borderWidth: "2px",
          }),
        }}
      />
      {shouldShowHoverTag && (
        <div
          className={styles.hoverBoxTagContainer}
          style={{ left: `${leftOffset}px` }}
        >
          <div
            ref={hoverTagRef}
            className={cn("node-outline-tag", tagPosClasses)}
          >
            {tagName && (
              <EditableNodeLabel
                studioCtx={studioCtx}
                displayName={tagName}
                icon={tagIcon}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
