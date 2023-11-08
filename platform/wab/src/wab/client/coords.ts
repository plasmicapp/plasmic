import { Box, Pt, Rect, rectTopLeft } from "../geom";
import { StudioCtx } from "./studio-ctx/StudioCtx";
import { ViewCtx } from "./studio-ctx/view-ctx";

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

export function scalerToClientRect(rect: Rect, sc: StudioCtx): Rect {
  const scalerClientRect = sc.canvasScaler().getBoundingClientRect();
  return Box.fromRect(rect)
    .scale(sc.zoom)
    .moveBy(scalerClientRect.left, scalerClientRect.top)
    .rect();
}

export function clientToScalerRect(rect: Rect, sc: StudioCtx): Rect {
  const scalerClientRect = sc.canvasScaler().getBoundingClientRect();
  return Box.fromRect(rect)
    .moveBy(-scalerClientRect.left, -scalerClientRect.top)
    .scale(1 / sc.zoom)
    .rect();
}

export function frameToScalerRect(rect: Rect, vc: ViewCtx): Rect {
  const frameOffset = vc.canvasCtx.viewportContainerOffset();
  return Box.fromRect(rect).moveBy(frameOffset.left, frameOffset.top).rect();
}

export function scalerToFrameRect(rect: Rect, vc: ViewCtx, round = true): Rect {
  return clientToFrameRect(scalerToClientRect(rect, vc.studioCtx), vc, round);
}

export function frameToClientPt(pt: Pt, vc: ViewCtx): Pt {
  return rectTopLeft(frameToClientRect(pt.toZeroBox().rect(), vc));
}

export function clientToFramePt(pt: Pt, vc: ViewCtx, round = true): Pt {
  return rectTopLeft(clientToFrameRect(pt.toZeroBox().rect(), vc, round));
}

export function scalerToClientPt(pt: Pt, sc: StudioCtx): Pt {
  return rectTopLeft(scalerToClientRect(pt.toZeroBox().rect(), sc));
}

export function clientToScalerPt(pt: Pt, sc: StudioCtx): Pt {
  return rectTopLeft(clientToScalerRect(pt.toZeroBox().rect(), sc));
}

export function frameToScalerPt(pt: Pt, vc: ViewCtx): Pt {
  return rectTopLeft(frameToScalerRect(pt.toZeroBox().rect(), vc));
}

export function scalerToFramePt(pt: Pt, vc: ViewCtx, round = true): Pt {
  return rectTopLeft(scalerToFrameRect(pt.toZeroBox().rect(), vc, round));
}
