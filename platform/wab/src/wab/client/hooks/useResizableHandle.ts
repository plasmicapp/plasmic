import React from "react";
import { XDraggableEvent } from "../../commons/components/XDraggable";

interface ResizingState {
  initialX: number;
  initialWidth: number;
}

export function useResizableHandle(opts: {
  panelRef: React.RefObject<HTMLElement>;
  onChange?: (width: number) => void;
}) {
  const { panelRef, onChange } = opts;
  const resizingState = React.useRef<ResizingState | null>(null);

  const onDragStart = React.useCallback(
    (e: XDraggableEvent) => {
      if (!panelRef.current) {
        return;
      }
      const leftPane = panelRef.current;
      resizingState.current = {
        initialX: e.mouseEvent.clientX,
        initialWidth: leftPane.offsetWidth,
      };

      document.body.style.cursor = "ew-resize";
    },
    [panelRef, resizingState]
  );

  const onDragStop = React.useCallback(
    (e: XDraggableEvent) => {
      resizingState.current = null;
      document.body.style.cursor = "";
    },
    [resizingState]
  );

  const onDrag = React.useCallback(
    (e: XDraggableEvent) => {
      if (!resizingState.current || !panelRef.current) {
        return;
      }
      e.mouseEvent.preventDefault();
      const newWidth = Math.min(
        Math.max(
          resizingState.current.initialWidth +
            e.mouseEvent.clientX -
            resizingState.current.initialX,
          180
        ),

        1000
      );

      onChange?.(newWidth);
    },
    [resizingState, panelRef, onChange]
  );

  return {
    onDragStart,
    onDragStop,
    onDrag,
    resizingState,
  };
}
