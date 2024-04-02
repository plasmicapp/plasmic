import { plasmicCanvasTransformEvent } from "@/wab/client/definitions/events";
import { requestIdleCallback } from "@/wab/client/requestidlecallback";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { observer } from "mobx-react";
import * as React from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import styles from "./ResizingHandler.module.scss";

export enum HandlePosition {
  bottom = "bottom",
  top = "top",
  left = "left",
  right = "right",
}

const resizingHandleDragEvent = "plasmicResizingHandleDragEvent";

export const ResizingHandle = observer(function ResizingHandle({
  position,
  zoom,
  size = 80,
  onDrag,
  onStopDragging,
  onStartDragging,
}: {
  onDrag: (
    move: { deltaY?: number; deltaX?: number },
    handlePosition: HandlePosition
  ) => void;
  onStopDragging?: () => void;
  onStartDragging?: () => void;
  zoom: number;
  size?: number;
  position: HandlePosition;
}) {
  const isHorizontal = ["bottom", "top"].includes(position);
  const studioCtx = useStudioCtx();

  const _onDrag = useCallback(
    ({ data }) => {
      window.dispatchEvent(new Event(resizingHandleDragEvent));
      // tslint:disable-next-line:switch-default
      switch (position) {
        case HandlePosition.bottom:
          return onDrag({ deltaY: data.deltaY / zoom }, position);

        case HandlePosition.top:
          return onDrag({ deltaY: -data.deltaY / zoom }, position);

        case HandlePosition.right:
          return onDrag({ deltaX: data.deltaX / zoom }, position);

        case HandlePosition.left:
          return onDrag({ deltaX: -data.deltaX / zoom }, position);
      }
    },
    [onDrag, position]
  );

  const [offset, setOffset] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    height?: number;
    width?: number;
  }>({});

  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function updateSize(e?: Event) {
      const requestCallback =
        e?.type === resizingHandleDragEvent
          ? requestIdleCallback
          : window.requestAnimationFrame;

      requestCallback(() => {
        const parent = rootRef.current?.parentElement;
        const clipper = studioCtx.maybeCanvasClipper();

        if (!clipper) {
          // since the callback, it may be that the studioCtx has now been
          // unmounted, so there's nothing to do for us
          return;
        }

        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const clipperRect = clipper.getBoundingClientRect();

          const isVerticalBar = [
            HandlePosition.left,
            HandlePosition.right,
          ].includes(position);

          const targetEdge = isVerticalBar ? "top" : "left";
          const counterEdge = isVerticalBar ? "bottom" : "right";
          const targetDimension = isVerticalBar ? "height" : "width";

          const offsetEdge =
            parentRect[targetEdge] < clipperRect[targetEdge]
              ? clipperRect[targetEdge] - parentRect[targetEdge]
              : 0;

          const offsetCounterEdge =
            parentRect[targetEdge] + parentRect[targetDimension] >
            clipperRect[targetEdge] + clipperRect[targetDimension]
              ? parentRect[targetDimension] -
                (clipperRect[targetEdge] -
                  parentRect[targetEdge] +
                  clipperRect[targetDimension])
              : 0;

          setOffset({
            [targetEdge]: offsetEdge / zoom,
            [counterEdge]: offsetCounterEdge / zoom,
            [targetDimension]:
              (parentRect[targetDimension] - offsetEdge - offsetCounterEdge) /
              zoom,
          });
        }
      });
    }

    updateSize();

    window.addEventListener(plasmicCanvasTransformEvent, updateSize);
    window.addEventListener(resizingHandleDragEvent, updateSize);

    return () => {
      window.removeEventListener(plasmicCanvasTransformEvent, updateSize);
      window.removeEventListener(resizingHandleDragEvent, updateSize);
    };
  }, []);

  return (
    <XDraggable
      onDrag={_onDrag}
      onStop={onStopDragging}
      onStart={onStartDragging}
      minPx={0}
    >
      <div
        ref={rootRef}
        className={`${styles.handleRoot} ${styles[position]}`}
        style={{ padding: 7 / zoom, ...offset }}
      >
        <div
          className={styles.handle}
          style={{
            width: isHorizontal ? size / zoom : 3 / zoom,
            height: isHorizontal ? 3 / zoom : size / zoom,
          }}
        />
      </div>
    </XDraggable>
  );
});
