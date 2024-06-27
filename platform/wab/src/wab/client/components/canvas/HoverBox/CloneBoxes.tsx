import { CanvasTransformedBox } from "@/wab/client/components/canvas/CanvasTransformedBox";
import { useRerenderOnUserBodyChange } from "@/wab/client/components/canvas/UserBodyObserver";
import {
  BASE_VARIANT_COLOR,
  NON_BASE_VARIANT_COLOR,
} from "@/wab/client/components/studio/GlobalCssVariables";
import { hasLayoutBox } from "@/wab/client/dom";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { maybes } from "@/wab/shared/common";
import { Selectable } from "@/wab/shared/core/selection";
import Chroma from "@/wab/shared/utils/color-utils";
import { isTplVariantable } from "@/wab/shared/core/tpls";
import $ from "jquery";
import { computed } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
export const CloneBoxes = observer(function CloneBoxes() {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx();
  const selectable = viewCtx?.focusedSelectable();
  const cloneKeys = viewCtx?.studioCtx.isUnlogged()
    ? []
    : viewCtx?.selectableToCloneKeys(selectable) ?? [];

  const skip = !selectable;
  const needsRecompute = useRerenderOnUserBodyChange(studioCtx, viewCtx, skip);

  if (!viewCtx || !selectable) {
    return null;
  }

  return (
    <>
      {cloneKeys.map((key) => (
        <CloneBox
          viewCtx={viewCtx}
          selectable={selectable}
          cloneKey={key}
          key={needsRecompute + "_" + key}
        />
      ))}
    </>
  );
});

interface CloneBoxProps {
  cloneKey: string;
  viewCtx: ViewCtx;
  selectable: Selectable;
}

const CloneBox = observer(function CloneBox({
  cloneKey,
  selectable,
  viewCtx,
}: CloneBoxProps) {
  const cloneSelectable = viewCtx.renderState.sel2clone(selectable, cloneKey);
  const $elt = maybes(cloneSelectable)((sel) =>
    viewCtx.renderState.sel2dom(sel, viewCtx.canvasCtx, cloneKey)
  )((dom) => $(dom))();
  const isTargetingSomeNonBaseVariant =
    isTplVariantable(selectable.tpl) &&
    viewCtx.variantTplMgr().isTargetingNonBaseVariant(selectable.tpl);

  const isFocusedClone = computed(
    () => viewCtx.focusedCloneKey() === cloneKey
  ).get();
  const isFocusedElt = computed(() => {
    const focusedElt = viewCtx.focusedDomElt();
    return !!focusedElt && !!$elt && $elt.is($(focusedElt));
  }).get();

  const shouldShow =
    $elt &&
    !isFocusedClone &&
    $elt.length &&
    $elt.get(0).isConnected &&
    $elt.toArray().filter(hasLayoutBox).length > 0 &&
    !isFocusedElt;

  if (!shouldShow || !$elt) {
    return null;
  }

  const color = isTargetingSomeNonBaseVariant
    ? NON_BASE_VARIANT_COLOR
    : BASE_VARIANT_COLOR;
  return (
    <CanvasTransformedBox
      relativeTo={"arena"}
      $elt={$elt}
      viewCtx={viewCtx}
      className={"ElementHighlightBoxContainer"}
    >
      <div
        className="ElementHighlightBoxRendered"
        style={{
          borderColor: Chroma(color).alpha(0.05).css(),
          backgroundColor: Chroma(color).alpha(0.05).css(),
        }}
      />
    </CanvasTransformedBox>
  );
});
