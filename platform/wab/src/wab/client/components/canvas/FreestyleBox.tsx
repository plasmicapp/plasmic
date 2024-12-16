import { NodeTargeter } from "@/wab/client/Dnd";
import { resizeRect } from "@/wab/client/FreestyleManipulator";
import { clientToFramePt, clientToFrameRect } from "@/wab/client/coords";
import { renderCantAddMsg } from "@/wab/client/messages/parenting-msgs";
import {
  cssPropsForInvertTransform,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  XDraggable,
  XDraggableEvent,
} from "@/wab/commons/components/XDraggable";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensure, ensureString } from "@/wab/shared/common";
import {
  isTplSlot,
  isTplTag,
  isTplTagOrComponent,
} from "@/wab/shared/core/tpls";
import { Box, Pt, Rect, rectTopLeft } from "@/wab/shared/geom";
import { ensureKnownTplTag } from "@/wab/shared/model/classes";
import { notification } from "antd";
import $ from "jquery";
import { observer } from "mobx-react";
import React, { useState } from "react";

export function _FreestyleBox() {
  const [targeter, setTargeter] = useState<NodeTargeter | undefined>(undefined);
  const studioCtx = useStudioCtx();
  const freestyleState = studioCtx.freestyleState();
  if (!freestyleState) {
    return null;
  }

  function getClientRect(e: XDraggableEvent) {
    // Maintain proportion.
    const mouseEvent = e.mouseEvent;
    return resizeRect(
      mouseEvent,
      new Pt(e.data.deltaX, e.data.deltaY),
      new Pt(e.data.initX, e.data.initY).toUnitBox().rect(),
      "bottom-right"
    );
  }

  const findTargetVc = (e: React.MouseEvent) => {
    for (const vc of studioCtx.viewCtxs) {
      const rect = vc.canvasCtx.viewportContainer().getBoundingClientRect();
      if (Box.fromRect(rect).contains(new Pt(e.clientX, e.clientY))) {
        return vc;
      }
    }
    return undefined;
  };

  const guardOffset = { top: -500000, left: -500000 };
  const getFreestyleBoxStyle = (e: XDraggableEvent) => {
    const drawnClientRect = getClientRect(e);
    const drawnScalerRect = studioCtx
      .viewportCtx!.clientToScaler(Box.fromRect(drawnClientRect))
      .rect();
    const invertTransformStyle = cssPropsForInvertTransform(
      studioCtx.zoom,
      drawnScalerRect
    );
    return {
      ...drawnScalerRect,
      ...invertTransformStyle,
      top: drawnScalerRect.top - guardOffset.top,
      left: drawnScalerRect.left - guardOffset.left,
    };
  };

  return (
    <XDraggable
      onStart={async (e) =>
        studioCtx.changeUnsafe(
          () => {
            studioCtx.startUnlogged();
            const targetViewCtx = findTargetVc(e.mouseEvent);
            if (
              !targetViewCtx ||
              !targetViewCtx.valState().maybeValUserRoot()
            ) {
              return;
            }
            const newTargeter = new NodeTargeter(targetViewCtx);
            setTargeter(newTargeter);
          },
          { event: e.mouseEvent }
        )
      }
      onDrag={async (e) =>
        studioCtx.changeUnsafe(
          () => {
            if (!targeter) {
              return;
            }
            const clientRect = getClientRect(e);
            const [ins, adoptees] = ensure(
              targeter,
              "targeter should exist"
            ).getAbsInsertionAndAdoptees(
              clientRect,
              e.mouseEvent.ctrlKey || e.mouseEvent.metaKey,
              ensureString(freestyleState.spec.key) === "text"
            );
            targeter.vc.setHighlightedAdoptees(adoptees);
          },
          { event: e.mouseEvent }
        )
      }
      onStop={async (e) =>
        studioCtx.changeUnsafe(
          () => {
            studioCtx.stopUnlogged();
            if (!targeter) {
              studioCtx.setFreestyleState(undefined);
            } else if (e.data.aborted) {
              targeter.vc.setHighlightedAdoptees([]);
              studioCtx.setFreestyleState(undefined);
              targeter.vc.setDndTentativeInsertion(undefined);
            } else {
              insertFreestyleAsDrawn(
                targeter.vc,
                ensure(targeter, "targeter should exist"),
                getClientRect(e),
                e.mouseEvent
              );
            }
            setTargeter(undefined);
          },
          { event: e.mouseEvent }
        )
      }
      render={(e) => (
        <div
          className={"FreestyleBox__guard"}
          onClick={async (event) => {
            const targetVc = findTargetVc(event);
            const spec = ensure(
              studioCtx.freestyleState(),
              "freestyle state not found in studio ctx"
            ).spec;
            await studioCtx.changeUnsafe(
              () => {
                if (!targetVc) {
                  studioCtx.setFreestyleState(undefined);
                  return;
                }
                if (event.altKey) {
                  // With e.altKey held down, we intend to wrap the clicked tplnode with
                  // the new node
                  insertFreestyleAsWrapper(targetVc, event);
                } else {
                  // Otherwise, with just a click, we will just create an auto-sized node
                  // at the clicked location
                  insertDefaultFreestyle(targetVc, event);
                }
              },
              { event }
            );
          }}
        >
          {e && e.data.started && (
            <div
              className={"FreestyleBox__box"}
              style={getFreestyleBoxStyle(e)}
            />
          )}
        </div>
      )}
    />
  );
}

function insertFreestyleAsDrawn(
  viewCtx: ViewCtx,
  targeter: NodeTargeter,
  clientRect: Rect,
  e: React.MouseEvent
) {
  const studioCtx = viewCtx.studioCtx;
  const freestyleState = ensure(
    studioCtx.freestyleState(),
    "freestyle state not found in studio ctx"
  );
  const forceFree = e.ctrlKey || e.metaKey;
  const [ins, adoptees] = targeter.getAbsInsertionAndAdoptees(
    clientRect,
    forceFree,
    freestyleState.spec.key === "text"
  );
  targeter.clear();
  viewCtx.setHighlightedAdoptees([]);
  studioCtx.setFreestyleState(undefined);
  studioCtx.setStudioFocusOnFrameContents(viewCtx.arenaFrame());

  if (!ins) {
    notification.error({
      message: "Must draw inside an existing artboard or element",
    });
  } else {
    const frameRect = clientToFrameRect(clientRect, viewCtx);
    viewCtx
      .getViewOps()
      .insertFreestyle(freestyleState.spec, ins, frameRect, adoptees);
  }
}

/**
 * Inserts a default-sized item at the location of the mouse click event
 */
function insertDefaultFreestyle(viewCtx: ViewCtx, e: React.MouseEvent) {
  const studioCtx = viewCtx.studioCtx;
  const freestyleState = ensure(
    studioCtx.freestyleState(),
    "freestyle state not found in studio ctx"
  );
  const targeter = new NodeTargeter(viewCtx);
  const clientPt = new Pt(e.clientX, e.clientY);
  const clientRect = clientPt.toZeroBox().rect();
  const forceFree = e.ctrlKey || e.metaKey;
  const ins = forceFree
    ? targeter.getAbsInsertion(clientPt)
    : targeter.getInsertion(clientPt);
  if (ins) {
    if (ins.type === "ErrorInsertion") {
      notification.error({
        message: "Cannot insert here",
        description: renderCantAddMsg(ins.msg),
      });
    } else {
      studioCtx.setStudioFocusOnFrameContents(viewCtx.arenaFrame());
      const frameRect = clientToFrameRect(clientRect, viewCtx);
      const framePlace = rectTopLeft(frameRect);
      viewCtx
        .getViewOps()
        .insertFreestyle(freestyleState.spec, ins, framePlace, []);
    }
  }
  targeter.clear();
  studioCtx.setFreestyleState(undefined);
}

/**
 * Inserts a wrapping tag around the TplNode being clicked on
 */
function insertFreestyleAsWrapper(viewCtx: ViewCtx, e: React.MouseEvent): void {
  const studioCtx = viewCtx.studioCtx;
  const freestyleState = ensure(
    studioCtx.freestyleState(),
    "freestyle state not found in studio ctx"
  );

  // We need to figure out which element we actually clicked on (and thus intend to wrap)
  // We cannot just use e.currentTarget, because that is going to just be the freestyle
  // guard.  Instead, we figure out the coordinate of the click within the frame, and
  // use HTMLDocument.elementFromPoint() to find the element to use.
  const framePt = clientToFramePt(new Pt(e.clientX, e.clientY), viewCtx);
  const doc = viewCtx.canvasCtx.$doc()[0] as any as HTMLDocument;
  const targetElt = doc.elementFromPoint(framePt.x, framePt.y);
  if (targetElt) {
    const viewOps = viewCtx.viewOps;
    const { focusedTpl: tplToWrap } = viewOps.getFinalFocusable(
      $(targetElt as HTMLElement)
    );
    if (tplToWrap && (isTplTagOrComponent(tplToWrap) || isTplSlot(tplToWrap))) {
      const newNode = freestyleState.spec.factory(viewOps.viewCtx(), undefined);
      if (newNode && isTplTag(newNode)) {
        const wrapper = ensureKnownTplTag($$$(newNode).clear().one());
        viewOps.insertAsParent(wrapper, tplToWrap);
        viewCtx.selectNewTpl(wrapper);
      }
    }
  }
  studioCtx.setFreestyleState(undefined);
}

export const FreestyleBox = observer(_FreestyleBox);
