import { XDraggableEvent } from "@/wab/commons/components/XDraggable";
import { clamp } from "lodash";
import React from "react";

interface ResizingState {
  horizontal: boolean;
  initialPos: number;
  initialSize: number;
  size: number;
}

export function useResizableHandle(opts: {
  panelRef: React.RefObject<HTMLElement>;
  dimension?: "width" | "height";
  /** Handle is on the panel's left/top edge, so dragging toward the start grows it. */
  invert?: boolean;
  /** Current size when the caller tracks it; else measured from panelRef on drag start. */
  size?: number;
  minSize?: number;
  maxSize?: number | (() => number);
  onChange?: (size: number) => void;
  onStop?: (size: number) => void;
}) {
  const optsRef = React.useRef(opts);
  optsRef.current = opts;
  const resizingState = React.useRef<ResizingState | null>(null);

  const onDragStart = React.useCallback((e: XDraggableEvent) => {
    const { panelRef, dimension = "width", size } = optsRef.current;
    const horizontal = dimension === "width";
    const panel = panelRef.current;
    const initialSize =
      size ?? (horizontal ? panel?.offsetWidth : panel?.offsetHeight);
    if (initialSize == null) {
      return;
    }
    resizingState.current = {
      horizontal,
      initialPos: horizontal ? e.mouseEvent.clientX : e.mouseEvent.clientY,
      initialSize,
      size: initialSize,
    };
    document.body.style.cursor = horizontal ? "ew-resize" : "ns-resize";
  }, []);

  const onDragStop = React.useCallback(() => {
    const resizing = resizingState.current;
    resizingState.current = null;
    document.body.style.cursor = "";
    if (resizing) {
      optsRef.current.onStop?.(resizing.size);
    }
  }, []);

  const onDrag = React.useCallback((e: XDraggableEvent) => {
    const resizing = resizingState.current;
    if (!resizing) {
      return;
    }
    e.mouseEvent.preventDefault();
    const { invert, minSize = 180, maxSize = 1000, onChange } = optsRef.current;
    const delta =
      (resizing.horizontal ? e.mouseEvent.clientX : e.mouseEvent.clientY) -
      resizing.initialPos;
    resizing.size = clamp(
      resizing.initialSize + (invert ? -delta : delta),
      minSize,
      typeof maxSize === "function" ? maxSize() : maxSize,
    );
    onChange?.(resizing.size);
  }, []);

  return {
    onDragStart,
    onDragStop,
    onDrag,
    resizingState,
  };
}
