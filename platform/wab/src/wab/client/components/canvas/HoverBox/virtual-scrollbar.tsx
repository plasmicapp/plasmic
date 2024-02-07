import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import classNames from "classnames";
import * as React from "react";

export function VirtualScrollBar(props: {
  element: HTMLElement;
  axis: "horizontal" | "vertical";
  className?: string;
  barClassName?: string;
  style?: React.CSSProperties;
}) {
  const { element, className, barClassName, style, axis } = props;
  const studioCtx = useStudioCtx();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);

  const containerSizeProp =
    axis === "vertical" ? "clientHeight" : "clientWidth";
  const contentSizeProp = axis === "vertical" ? "scrollHeight" : "scrollWidth";
  const contentStartProp = axis === "vertical" ? "scrollTop" : "scrollLeft";
  const deltaProp = axis === "vertical" ? "deltaY" : "deltaX";
  const thumbPositionProp = axis === "vertical" ? "top" : "left";
  const thumbSizeProp = axis === "vertical" ? "height" : "width";
  const overflow =
    getComputedStyle(element)[`overflow${axis === "vertical" ? "Y" : "X"}`];

  if (
    element[containerSizeProp] >= element[contentSizeProp] ||
    overflow !== "auto"
  ) {
    return null;
  }

  return (
    <div
      className={classNames(
        `HoverBox__ScrollBar`,
        `HoverBox__ScrollBar--${axis}`,
        className
      )}
      onMouseDown={(e) => e.preventDefault()}
      onMouseUp={(e) => e.preventDefault()}
      style={style}
      ref={trackRef}
    >
      <XDraggable
        onDrag={(e) => {
          if (trackRef.current) {
            const maxStart =
              element[contentSizeProp] - element[containerSizeProp];
            // We scale the delta so that dragging is 1:1 with the thumb
            // and not with the content
            const delta =
              ((e.draggableData[deltaProp] / element[containerSizeProp]) *
                element[contentSizeProp]) /
              studioCtx.zoom;
            const newStart = Math.min(
              Math.max(0, element[contentStartProp] + delta),
              maxStart
            );
            if (thumbRef.current) {
              thumbRef.current.style[thumbPositionProp] = `${
                (newStart / element[contentSizeProp]) * 100
              }%`;
            }
            element[contentStartProp] = newStart;
          }
        }}
      >
        <div
          className={classNames(
            `HoverBox__ScrollBar__Thumb HoverBox__ScrollBar__Thumb--${axis}`,
            barClassName
          )}
          style={{
            [thumbPositionProp]: `${
              (element[contentStartProp] / element[contentSizeProp]) * 100
            }%`,
            [thumbSizeProp]: `${
              (element[containerSizeProp] / element[contentSizeProp]) * 100
            }%`,
          }}
          ref={thumbRef}
        />
      </XDraggable>
    </div>
  );
}
