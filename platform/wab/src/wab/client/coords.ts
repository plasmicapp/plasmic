import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { Box, Pt, Rect, rectTopLeft } from "@/wab/shared/geom";

// clientRect: a rect in the top most window's viewport
// frameRect: a rect in iframe. Subject to current studio zoom.
// scalerRect: a rect in the scaler. Subject to current studio zoom.

export function frameToClientRect(rect: Rect, vc: ViewCtx): Rect {
  const frameClientRect = vc.canvasCtx.viewport().getBoundingClientRect();
  return Box.fromRect(rect)
    .scale(vc.studioCtx.zoom)
    .moveBy(frameClientRect.left, frameClientRect.top)
    .rect();
}

export function clientToFrameRect(rect: Rect, vc: ViewCtx, round = true): Rect {
  const frameClientRect = vc.canvasCtx.viewport().getBoundingClientRect();
  let box = Box.fromRect(rect)
    .moveBy(-frameClientRect.left, -frameClientRect.top)
    .scale(1 / vc.studioCtx.zoom);
  if (round) {
    box = box.round();
  }
  return box.rect();
}

export function frameToScalerRect(rect: Rect, vc: ViewCtx): Rect {
  const frameOffset = vc.canvasCtx.viewportContainerOffset();
  return Box.fromRect(rect).moveBy(frameOffset.left, frameOffset.top).rect();
}

export function scalerToFrameRect(rect: Rect, vc: ViewCtx, round = true): Rect {
  return clientToFrameRect(
    vc.viewportCtx.scalerToClient(Box.fromRect(rect)).rect(),
    vc,
    round
  );
}

export function frameToClientPt(pt: Pt, vc: ViewCtx): Pt {
  return rectTopLeft(frameToClientRect(pt.toZeroBox().rect(), vc));
}

export function clientToFramePt(pt: Pt, vc: ViewCtx, round = true): Pt {
  return rectTopLeft(clientToFrameRect(pt.toZeroBox().rect(), vc, round));
}
