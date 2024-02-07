import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import React from "react";
import { useEvent } from "react-use";

interface UnloggedDragCatcherProps {
  sc: StudioCtx;
  className?: string;
  children?: React.ReactNode;
}

export function UnloggedDragCatcher(props: UnloggedDragCatcherProps) {
  const { sc, className } = props;

  const isDraggingRef = React.useRef(false);

  const handleStart = React.useCallback(() => {
    sc.startUnlogged();
    isDraggingRef.current = true;
  }, [sc]);
  const handleStop = React.useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      sc.stopUnlogged();
    }
  }, [sc, isDraggingRef]);

  // We install the pointerup event handler on the document instead
  // of the div, in case the pointerup event happens outside of the div
  useEvent("pointerup", handleStop, document);
  return (
    <div onPointerDownCapture={handleStart} className={className}>
      {props.children}
    </div>
  );
}
