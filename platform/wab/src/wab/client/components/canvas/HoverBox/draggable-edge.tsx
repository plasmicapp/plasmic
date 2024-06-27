import sty from "@/wab/client/components/canvas/HoverBox/draggable-edge.module.sass";
import EdgeHandleDownwardIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__EdgeHandleDownward";
import EdgeHandleLeftwardIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__EdgeHandleLeftward";
import EdgeHandleRightwardIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__EdgeHandleRightward";
import EdgeHandleUpwardIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__EdgeHandleUpward";
import { cx } from "@/wab/shared/common";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { oppSide, Side, sideEdgeToOrient, standardSides } from "@/wab/shared/geom";
import { clamp, isNil } from "lodash";
import * as React from "react";

export type SpaceEdgeType = "padding" | "margin" | "size";
export type EdgeDragMode = "single" | "symmetric" | "all";

export function getAffectedSides(side: Side, mode: EdgeDragMode) {
  if (mode === "single") {
    return [side];
  } else if (mode === "symmetric") {
    return [side, oppSide(side)];
  } else {
    return standardSides;
  }
}

const EDGE_WIDTH = 3;
const EDGE_HANDLE_WIDTH = 10;
const MIN_INNER_SPACE_FOR_PADDING_EDGE = 20;
const MIN_INNER_SPACE_FOR_MARGIN_EDGE = 0;
const MIN_INNER_SPACE_FOR_PADDING_HOVER_LABEL = 0;
const MIN_INNER_SPACE_FOR_MARGIN_HOVER_LABEL = 0;
const KNOB_WIDTH = DEVFLAGS.spacingVisualizer202209 ? 12 : 16;
const KNOB_HEIGHT = DEVFLAGS.spacingVisualizer202209 ? 3 : 6;
const LABEL_SLACK_SPACE = 10;
const RESIZE_SQUARE_SIZE = 8;
const RESIZE_SQUARE_KNOB_OFFSET = 1;
const KNOB_AT_ZERO_OFFSET = RESIZE_SQUARE_SIZE / 2 + RESIZE_SQUARE_KNOB_OFFSET;

interface DragState {
  initValue: number;
}

/**
 * This component renders up to three edge controls for a "side" of the hoverbox -
 * margin, padding, and size.
 *
 * @param props.paddingPxValue if specified, is the current padding value (in frame coordinates).
 *   If null, then padding control is not allowed.
 * @param props.marginPxValue if specified, is the current margin value (in frame coordinates).
 *   If null, then margin control is not allowed.
 * @param props.sizePxValue if specified, is the current size value (in frame coordinates).
 *   If null, then resizing is not allowed.
 * @param props.zoom The current studio zoom level
 * @param props.isAutoSized if specified, then the element is auto-sized in this axis
 * @param props.draggedSide currently-dragged side, if any
 * @param props.draggedEdge currently-dragged edge type, if any
 * @param props.isAffectedSide whether this side is "affected" by current dragging, by
 *   the user holding down alt or shift modifier keys
 */
export function SpaceEdgeControls(props: {
  side: Side;
  paddingLabel?: React.ReactNode;
  marginLabel?: React.ReactNode;
  onDragStart: (side: Side, edgeType: SpaceEdgeType) => void;
  onDrag: (
    side: Side,
    edgeType: SpaceEdgeType,
    delta: number,
    mode: EdgeDragMode
  ) => void;
  onDragStop: (side: Side, edgeType: SpaceEdgeType) => void;
  onDoubleClick: (side: Side, edgeType: SpaceEdgeType) => void;
  onHover: (hovered: boolean) => void;
  paddingPxValue: number | null;
  marginPxValue: number | null;
  sizePxValue: number | null;
  draggedSide?: Side;
  draggedEdgeType?: SpaceEdgeType;
  isAffectedSide?: boolean;
  zoom: number;
  childAlign?: ContainerChildAlignment;
  isAutoSized?: boolean;
  showMeasurements?: boolean;
  focusedHeight?: number;
  focusedWidth?: number;
  showSquare?: boolean;
  disabledDnd?: boolean;
}) {
  const {
    side,
    paddingLabel,
    marginLabel,
    onDragStart,
    onDrag,
    onDragStop,
    onDoubleClick,
    paddingPxValue,
    marginPxValue,
    draggedEdgeType,
    draggedSide,
    isAffectedSide,
    onHover,
    zoom,
    sizePxValue,
    childAlign,
    isAutoSized,
    showMeasurements,
    focusedHeight,
    focusedWidth,
    showSquare,
    disabledDnd,
  } = props;
  const shouldShowResizeSquare = DEVFLAGS.spacingVisualizer202209 && showSquare;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const marginScreenValue = (marginPxValue ?? 0) * zoom;
  const innerSpace =
    ((sideEdgeToOrient(side) === "horiz" ? focusedHeight : focusedWidth) ?? 0) *
    zoom;
  // This whole thing looks like this for the left edge:
  // | margin area | padding area |
  // And then we draw the sizing border in the middle between margin / padding.
  // Because we want the middle border there to be positioned on top of the
  // hoverbox edge (so, margin is outside the box, and padding is inside),
  // we set [side] to -margin (so if margin-left is 30px, then this whole
  // thing is positioned at left:-30px).
  return (
    <div
      className={cx(sty.root, {
        [sty.top]: side === "top",
        [sty.bottom]: side === "bottom",
        [sty.left]: side === "left",
        [sty.right]: side === "right",
        [sty.isSomeDragging]: !!draggedSide,
      })}
      style={{
        [side]: -marginScreenValue,
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      ref={rootRef}
    >
      {marginPxValue != null && (
        <SpaceEdgeArea
          side={side}
          edgeType="margin"
          label={<>Margin: {marginLabel}</>}
          showArea={
            DEVFLAGS.spacingArea ||
            (showMeasurements && marginPxValue > 0) ||
            (draggedEdgeType === "margin" && isAffectedSide)
          }
          showLabel={
            (showMeasurements && marginPxValue > 0 && innerSpace > 100) ||
            (draggedEdgeType === "margin" && draggedSide === side)
          }
          value={marginPxValue}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onDoubleClick={onDoubleClick}
          zoom={zoom}
          isAutoSized={isAutoSized}
          childAlign={childAlign}
          isSomeDragging={!!draggedSide}
          isDragging={draggedSide === side && draggedEdgeType === "margin"}
          innerSpace={innerSpace}
          shouldOffsetKnob={shouldShowResizeSquare}
          disabledDnd={disabledDnd}
        />
      )}
      {paddingPxValue != null && (
        <SpaceEdgeArea
          side={side}
          edgeType="padding"
          label={<>Padding: {paddingLabel}</>}
          showArea={
            DEVFLAGS.spacingArea ||
            (showMeasurements && paddingPxValue > 0) ||
            (draggedEdgeType === "padding" && isAffectedSide)
          }
          showLabel={
            (showMeasurements && paddingPxValue > 0 && innerSpace > 100) ||
            (draggedEdgeType === "padding" && draggedSide === side)
          }
          value={paddingPxValue}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onDoubleClick={onDoubleClick}
          zoom={zoom}
          isAutoSized={isAutoSized}
          childAlign={childAlign}
          isSomeDragging={!!draggedSide}
          isDragging={draggedSide === side && draggedEdgeType === "padding"}
          innerSpace={innerSpace}
          shouldOffsetKnob={shouldShowResizeSquare}
          disabledDnd={disabledDnd}
        />
      )}
      {sizePxValue != null &&
        !disabledDnd &&
        (() => {
          const onlyWithPadding =
            !isNil(paddingPxValue) && isNil(marginPxValue);
          const onlyWithMargin = isNil(paddingPxValue) && !isNil(marginPxValue);

          // If we are accompanying both padding and margin, then we make the
          // sizing border a bit smaller to make room.
          const thickness = draggableThickness(
            innerSpace,
            !isNil(paddingPxValue) && !isNil(marginPxValue)
              ? EDGE_HANDLE_WIDTH / 2
              : EDGE_HANDLE_WIDTH
          );
          return (
            <DraggableEdge
              className={sty.size}
              edgeType="size"
              side={side}
              value={sizePxValue}
              onDragStart={() => {
                onDragStart(side, "size");
              }}
              onDrag={(newValue, mode) => {
                onDrag(side, "size", newValue, mode);
              }}
              onDragStop={() => {
                onDragStop(side, "size");
              }}
              onDoubleClick={() => onDoubleClick(side, "size")}
              zoom={zoom}
              growDirection="outward"
              placement={
                onlyWithPadding ? "outside" : onlyWithMargin ? "inside" : "edge"
              }
              thickness={thickness}
              // We are in the coordinates of SpaceEdgeControls, and the hoverbox edge is
              // always at marginScreenValue (so if margin-left is 50px, then the hoverbox
              // edge is at left:50)
              boxEdgePosition={marginScreenValue}
              // There is no offset for the sizing draggable edge from the hoverbox edge
              valuePositionOffset={0}
              showSquare={shouldShowResizeSquare}
            />
          );
        })()}
    </div>
  );
}

function getEdgeTransformOrigin(
  side: Side,
  flush: "inward" | "outward" | "center"
) {
  if (flush === "center") {
    return "50% 50%";
  }

  const orient = sideEdgeToOrient(side);
  return `${
    orient === "horiz"
      ? "50%"
      : side === "left"
      ? flush === "inward"
        ? "0%"
        : "100%"
      : flush === "inward"
      ? "100%"
      : "0%"
  } ${
    orient === "vert"
      ? "50%"
      : side === "top"
      ? flush === "inward"
        ? "0%"
        : "100%"
      : flush === "inward"
      ? "100%"
      : "0%"
  }
    `;
}

function getEdgeHandleCursor(
  side: Side,
  direction: "inward" | "outward" | "both"
) {
  const orient = sideEdgeToOrient(side);
  if (orient === "horiz") {
    if (direction === "both") {
      return "ns-resize";
    } else if (direction === "outward") {
      return side === "top" ? "n-resize" : "s-resize";
    } else {
      return side === "top" ? "s-resize" : "n-resize";
    }
  } else {
    if (direction === "both") {
      return "ew-resize";
    } else if (direction === "outward") {
      return side === "left" ? "w-resize" : "e-resize";
    } else {
      return side === "left" ? "e-resize" : "w-resize";
    }
  }
}

/**
 * This component renders a draggable edge, a filled colored area,
 * and maybe a knob, for margin or padding.
 */
export function SpaceEdgeArea(props: {
  side: Side;
  edgeType: SpaceEdgeType;
  label?: React.ReactNode;
  showArea?: boolean;
  showLabel?: boolean;
  value: number;
  onDragStart: (side: Side, edgeType: SpaceEdgeType) => void;
  onDrag: (
    side: Side,
    edgeType: SpaceEdgeType,
    delta: number,
    mode: EdgeDragMode
  ) => void;
  onDragStop: (side: Side, edgeType: SpaceEdgeType) => void;
  onDoubleClick: (side: Side, edgeType: SpaceEdgeType) => void;
  zoom: number;
  childAlign?: ContainerChildAlignment;
  isAutoSized?: boolean;
  isSomeDragging?: boolean;
  isDragging?: boolean;
  innerSpace: number;
  shouldOffsetKnob?: boolean;
  disabledDnd?: boolean;
}) {
  const {
    side,
    edgeType,
    value,
    label,
    showArea,
    showLabel,
    onDragStart,
    onDrag,
    onDragStop,
    onDoubleClick,
    zoom,
    isAutoSized,
    childAlign,
    isSomeDragging,
    innerSpace,
    shouldOffsetKnob,
    disabledDnd,
  } = props;
  const [handleHovered, setHandleHovered] = React.useState(false);
  // Placement of the area, either inside or outside of the box
  const placement = edgeType === "margin" ? "outside" : "inside";
  const growDirection = getGrowDirection(
    side,
    edgeType,
    isAutoSized,
    childAlign
  );
  const [labelElt, setLabelElt] = React.useState<HTMLDivElement | null>(null);
  const orientation = sideEdgeToOrient(side);
  return (
    <div
      className={cx(sty.edgeArea, {
        [sty.padding]: edgeType === "padding",
        [sty.margin]: edgeType === "margin",
        [sty.edgeAreaShown]: showArea,
        [sty.isHidden]:
          (edgeType === "padding" &&
            innerSpace < MIN_INNER_SPACE_FOR_PADDING_EDGE) ||
          (edgeType === "margin" &&
            innerSpace < MIN_INNER_SPACE_FOR_MARGIN_EDGE),
        [`growDirection-${growDirection}`]: true,
        [`placement-${placement}`]: true,
        [isAutoSized ? "autoSized" : "fixedSized"]: true,
        [`childAlign-${childAlign}`]: true,
      })}
      style={{
        [side === "top" || side === "bottom" ? "height" : "width"]:
          value * zoom,
      }}
    >
      {!DEVFLAGS.spacingVisualizer202209 && (
        <div className={sty.edgeAreaFill} />
      )}
      {!disabledDnd && (
        <DraggableEdge
          showArea={true}
          edgeType={edgeType}
          side={side}
          value={value}
          onDragStart={() => {
            onDragStart(side, edgeType);
          }}
          onDrag={(delta, mode) => {
            onDrag(side, edgeType, delta, mode);
          }}
          onDragStop={() => {
            onDragStop(side, edgeType);
          }}
          onDoubleClick={() => onDoubleClick(side, edgeType)}
          zoom={zoom}
          growDirection={growDirection}
          thickness={draggableThickness(innerSpace, EDGE_HANDLE_WIDTH)}
          placement={placement}
          onHover={(hovered) => {
            if (hovered) {
              if (!isSomeDragging) {
                setHandleHovered(true);
              }
            } else {
              setHandleHovered(false);
            }
          }}
          // Within the SpaceArea, for padding, the hoverbox edge is always 0
          // (for example, for padding-left, the hoverbox edge is on left:0).
          // For margin, the hoverbox edge is always at the opposite side
          // (for example, for margin-left, if margin was 50, then the
          // hoverbox edge would be at left:50)
          boxEdgePosition={edgeType === "padding" ? 0 : value * zoom}
          // Within the SpaceArea, the offset from the hoverbox edge is basically
          // the width of the SpaceArea.
          valuePositionOffset={value * zoom}
          showKnob
          shouldOffsetKnob={shouldOffsetKnob}
        />
      )}
      {(() => {
        if (!label || !(showLabel || handleHovered)) {
          // If there's no label, or if we're not asked to showLabel and we're not showing
          // because of hovering on the handle, then no need to render it at all.
          return null;
        }
        const labelStyles: React.CSSProperties = {
          transform: "translate(-50%, -50%)",
          [orientation === "horiz" ? "top" : "left"]: "50%",
        };
        if (labelElt) {
          const filledSpace = value * zoom;
          const labelSpace =
            labelElt[orientation === "horiz" ? "offsetHeight" : "offsetWidth"];
          if (filledSpace < labelSpace + 2 * LABEL_SLACK_SPACE) {
            // If there's not enough space to draw the label within the filled space, then
            // push the label outside of the filled space
            let offset: number;
            if (growDirection === "outward") {
              // For outward, the knob is at the outside edge
              if (side === "left" || side === "top") {
                // For left/top, just make the label offset from left/top by the slack space
                offset = LABEL_SLACK_SPACE;
              } else {
                // Otherwise, for say right, we'll want to knudge the label leftward by the
                // amount of protrusion
                offset = -1 * (labelSpace + LABEL_SLACK_SPACE - filledSpace);
              }
            } else {
              // For inward, the knob is at the inside edge
              if (side === "left" || side === "top") {
                offset = -1 * (labelSpace + LABEL_SLACK_SPACE - filledSpace);
              } else {
                offset = LABEL_SLACK_SPACE;
              }
            }
            labelStyles[orientation === "horiz" ? "top" : "left"] = 0;
            labelStyles.transform = `translate(${
              orientation === "vert" ? `${offset}px` : "-50%"
            }, ${orientation === "horiz" ? `${offset}px` : "-50%"})`;
          }
        }
        const hasSpaceForHoverLabel =
          innerSpace >=
          (edgeType === "padding"
            ? MIN_INNER_SPACE_FOR_PADDING_HOVER_LABEL
            : MIN_INNER_SPACE_FOR_MARGIN_HOVER_LABEL);
        return (
          <div
            className={cx(sty.edgeLabel, {
              [sty.isHidden]: !hasSpaceForHoverLabel,
            })}
            ref={(newLabelElt) => setLabelElt(newLabelElt)}
            style={labelStyles}
          >
            {label}
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Renders a draggable edge
 * @param props.placement specifies whether the draggable edge is on the
 *   inside, outside, or the edge of a hoverbox
 * @param props.growDirection specifies whether dragging outward or inward results
 *   in positive increase in the value
 * @param props.value The pixel length of the value, in frame coordinates
 * @param props.zoom studio zoom
 * @param props.thickness Thickness of the draggable region, in screen coordinates
 * @param props.boxEdgePosition The position of the hoverbox edge from the `side` direction,
 *   in screen coordinates, within the DOM offset parent for this edge.
 * @param props.valuePositionOffset The offset from the hoverbox edge, in screen coordinates,
 *   within the DOM offset parent for this edge.
 */
export function DraggableEdge(props: {
  className?: string;
  edgeType: SpaceEdgeType;
  side: Side;
  placement: "inside" | "outside" | "edge";
  growDirection: "inward" | "outward";
  value: number;
  onDragStart: () => void;
  onDrag: (delta: number, mode: EdgeDragMode) => void;
  onDragStop: () => void;
  onHover?: (hovered: boolean) => void;
  onDoubleClick: () => void;
  zoom: number;
  thickness: number;
  boxEdgePosition: number;
  valuePositionOffset: number;
  showArea?: boolean;
  showKnob?: boolean;
  showSquare?: boolean;
  shouldOffsetKnob?: boolean;
}) {
  const {
    edgeType,
    side,
    value,
    onDragStart,
    onDrag,
    onDragStop,
    onDoubleClick,
    zoom,
    className,
    onHover,
    growDirection,
    placement,
    thickness,
    valuePositionOffset,
    boxEdgePosition,
    showArea,
    showKnob,
    showSquare,
    shouldOffsetKnob,
  } = props;
  const orientation = sideEdgeToOrient(side);
  const direction =
    sideDirection(side) * (growDirection === "outward" ? 1 : -1);
  const [dragState, setDragState] = React.useState<DragState | undefined>(
    undefined
  );

  // isFlush is true if the draggable edge is "flush" against the hoverbox
  // edge just to the left or the right.  That happens in two cases:
  let isFlush =
    placement !== "edge" &&
    // When placed inside the hoverbox and growing outward, the draggable
    // edge is always flush against the inside of the hoverbox
    ((placement === "inside" && growDirection === "outward") ||
      // Similarly, when placed outside the hoverbox and growing inward,
      // we're also always flush against the outside of the hoverbox
      (placement === "outside" && growDirection === "inward") ||
      // If the valuePositionOffset -- distance from hoverbox edge -- is too small,
      // then the draggable edge is also just flush against the hoverbox
      valuePositionOffset < thickness / 2);

  if (DEVFLAGS.spacingVisualizer202209 && edgeType === "size") {
    isFlush = false;
  }

  return (
    <XDraggable
      onStart={() => {
        setDragState({
          initValue: value,
        });
        onDragStart();
      }}
      onDrag={(e) => {
        if (!dragState) {
          return;
        }
        const deltaValue =
          orientation === "horiz" ? e.data.deltaY : e.data.deltaX;
        const fixedDeltaValue = (direction * deltaValue) / zoom;
        onDrag(fixedDeltaValue, deriveDragMode(e.mouseEvent));
      }}
      onStop={() => {
        setDragState(undefined);
        onDragStop();
      }}
    >
      <div
        className={cx(sty.edgeAreaContainer, {
          [sty.isDraggedEdge]: !!dragState,
        })}
        style={{
          cursor: getEdgeHandleCursor(side, isFlush ? growDirection : "both"),
        }}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      >
        {DEVFLAGS.spacingVisualizer202209 && showArea && (
          <div className={cx(sty.edgeAreaFill, sty.interactive)} />
        )}

        <div
          className={cx(sty.edgeHandle, className, {
            [sty.isDraggedEdge]: !!dragState,
            [sty.isHovered]: !!dragState,
            [sty.edgeHandleVertical]: orientation === "vert",
            [sty.edgeHandleHorizontal]: orientation === "horiz",
          })}
          onDoubleClick={onDoubleClick}
          style={{
            [orientation === "vert" ? "width" : "height"]: thickness,
            // Now we need to position the draggable handle.  It is basically positioned
            // at the hoverbox edge, with some offset (for example, for margin-left, it's
            // positioned at hoverbox left edge, with some offset that accounts for the actual
            // margin that has been set).
            ...(isFlush
              ? {
                  // If we are flush, then we want to be right on boxEdgePosition, plus a small
                  // adjustment...
                  [side]:
                    boxEdgePosition +
                    // If placed outside, then we want to be entirely outside of the box boundary
                    (placement === "outside"
                      ? -thickness
                      : // Else we want to be entirely inside the box boundary
                      placement === "inside"
                      ? 0
                      : // Otherwise we split the difference
                        -thickness / 2),
                }
              : {
                  // If we're not flush, then we basically want to be at boxEdgePosition + valuePositionOffset
                  [side]:
                    boxEdgePosition +
                    (placement === "outside"
                      ? -valuePositionOffset
                      : valuePositionOffset) -
                    thickness / 2,
                }),
          }}
        >
          <div
            className={cx(sty.edge, {
              [sty.edgeVertical]: orientation === "vert",
              [sty.edgeHorizontal]: orientation === "horiz",
            })}
            style={{
              [orientation === "vert" ? "width" : "height"]: EDGE_WIDTH,
              transformOrigin: getEdgeTransformOrigin(
                side,
                isFlush
                  ? placement === "inside"
                    ? "inward"
                    : "outward"
                  : "center"
              ),
              // We are positioning the visible edge within the drag handle
              ...(isFlush
                ? {
                    // If flush, then we just want to be at the edge of the
                    // draggable handle, so it looks like
                    // |      draggable handle      |
                    // | edge |
                    // for, say, margin-right above.
                    [placement === "outside" ? oppSide(side) : side]: 0,
                  }
                : {
                    // If not flush, then we just place the visible edge at the middle
                    // of the draggable handle
                    [side]: thickness / 2 - EDGE_WIDTH / 2,
                  }),
            }}
          />
          {showKnob &&
            (() => {
              if (DEVFLAGS.spacingVisualizer202209) {
                let knobOffset = 0;
                if (shouldOffsetKnob) {
                  knobOffset =
                    value < KNOB_AT_ZERO_OFFSET ? KNOB_AT_ZERO_OFFSET : 0;
                }

                return (
                  <div
                    className={cx(sty.knob2, {
                      [sty.knobHoriz]: orientation === "horiz",
                      [sty.knobVert]: orientation === "vert",
                    })}
                    style={{
                      [orientation === "vert" ? "width" : "height"]:
                        KNOB_HEIGHT,
                      [orientation === "horiz" ? "width" : "height"]:
                        KNOB_WIDTH,
                      [placement === "outside" ? oppSide(side) : side]:
                        knobOffset + (isFlush ? 0 : thickness / 2),
                    }}
                  />
                );
              }

              const KnobClass = getEdgeHandleIcon(side, growDirection);
              return (
                <KnobClass
                  className={cx(sty.knob, {
                    [sty.knobHoriz]: orientation === "horiz",
                    [sty.knobVert]: orientation === "vert",
                  })}
                  style={{
                    [orientation === "vert" ? "width" : "height"]: KNOB_HEIGHT,
                    [orientation === "horiz" ? "width" : "height"]: KNOB_WIDTH,
                    [placement === "outside" ? oppSide(side) : side]: isFlush
                      ? 0
                      : thickness / 2,
                  }}
                />
              );
            })()}

          {showSquare &&
            (() => {
              return (
                <div
                  className={cx(
                    DEVFLAGS.spacingVisualizer202209 ? sty.square2 : sty.square,
                    {
                      [sty.squareTop]: side === "top",
                      [sty.squareBottom]: side === "bottom",
                      [sty.squareLeft]: side === "left",
                      [sty.squareRight]: side === "right",
                    }
                  )}
                />
              );
            })()}
        </div>
      </div>
    </XDraggable>
  );
}

function getEdgeHandleIcon(side: Side, growDirection: "inward" | "outward") {
  if (
    (side === "top" && growDirection === "outward") ||
    (side === "bottom" && growDirection === "inward")
  ) {
    return EdgeHandleUpwardIcon;
  } else if (
    (side === "top" && growDirection === "inward") ||
    (side === "bottom" && growDirection === "outward")
  ) {
    return EdgeHandleDownwardIcon;
  } else if (
    (side === "left" && growDirection === "outward") ||
    (side === "right" && growDirection === "inward")
  ) {
    return EdgeHandleLeftwardIcon;
  } else {
    return EdgeHandleRightwardIcon;
  }
}

function deriveDragMode(event: React.MouseEvent): EdgeDragMode {
  if (event.shiftKey) {
    return "all";
  } else if (event.altKey) {
    return "symmetric";
  } else {
    return "single";
  }
}

function draggableThickness(innerSpace: number, defaultWidth: number) {
  return clamp((defaultWidth * innerSpace) / 100, 2, defaultWidth);
}

function sideDirection(side: Side) {
  return side === "bottom" || side === "right" ? 1 : -1;
}

export type ContainerChildAlignment = "start" | "end";

function getGrowDirection(
  side: Side,
  edgeType: SpaceEdgeType,
  isAutoSized: boolean | undefined,
  childAlign: ContainerChildAlignment | undefined
) {
  const isStartEdge = side === "left" || side === "top";
  if (edgeType === "margin") {
    if (childAlign === "start") {
      // If we're top-aligned...
      if (isStartEdge) {
        // Drag margin-top down
        return "inward";
      } else {
        // Drag margin-bottom down
        return "outward";
      }
    } else if (childAlign === "end") {
      // If we're bottom-aligned
      if (isStartEdge) {
        // Drag margin-top up
        return "outward";
      } else {
        // Drag margin-bottom up
        return "inward";
      }
    } else {
      // Else by default behave like "normal" margin direction
      return "outward";
    }
  } else {
    // padding
    if (!isAutoSized) {
      // If there's a fixed size, then always drag inward
      return "inward";
    }
    if (childAlign === "start") {
      // If we're top-aligned
      if (isStartEdge) {
        // Drag padding-top down
        return "inward";
      } else {
        // Drag padding-bottom down
        return "outward";
      }
    } else if (childAlign === "end") {
      // If we're bottom-aligned
      if (isStartEdge) {
        // Drag padding-top up
        return "outward";
      } else {
        // Drag padding-bottom up
        return "inward";
      }
    } else {
      // childAlign is center or unknown. Behave like normal
      // padding drag
      return "inward";
    }
  }
}
//
