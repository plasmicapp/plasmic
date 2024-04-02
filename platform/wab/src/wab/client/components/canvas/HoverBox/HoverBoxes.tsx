import {
  ArenaFrame,
  isKnownArena,
  isKnownArenaFrame,
  TplNode,
} from "@/wab/classes";
import { EditableNodeLabel } from "@/wab/client/components/canvas/EditableNodeLabel";
import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import { toast } from "@/wab/client/components/Messages";
import {
  canEditSection,
  Section,
} from "@/wab/client/components/sidebar-tabs/Sections";
import { OneShortcutCombo } from "@/wab/client/components/studio/Shortcuts";
import { getContextMenuForFocusedTpl } from "@/wab/client/components/tpl-menu";
import { LinkButton } from "@/wab/client/components/widgets";
import { offsetPxAsUnits } from "@/wab/client/DimManip";
import { DragMoveManager } from "@/wab/client/Dnd";
import {
  DragMoveFrameManager,
  FreestyleManipulator,
  ManipState,
  ManipulatorAbortedError,
  mkFreestyleManipForFocusedDomElt,
  mkFreestyleManipForFocusedFrame,
} from "@/wab/client/FreestyleManipulator";
import {
  cssPropsForInvertTransform,
  StudioCtx,
  usePlasmicCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import {
  ensure,
  ensureArray,
  ensureInstance,
  maybe,
  spawnWrapper,
} from "@/wab/common";
import {
  XDraggable,
  XDraggableEvent,
} from "@/wab/commons/components/XDraggable";
import { sidesAndCorners, styleCase } from "@/wab/commons/ViewUtil";
import { DEVFLAGS } from "@/wab/devflags";
import {
  Corner,
  isAxisSide,
  Pt,
  Side,
  sideOrCornerToSides,
  sideToOrient,
  sideToSize,
} from "@/wab/geom";
import { isSelectableLocked, Selectable, SQ } from "@/wab/selection";
import {
  isHeightAutoDerived,
  isPositionManagedFrame,
} from "@/wab/shared/Arenas";
import { createNumericSize, showSizeCss, Unit } from "@/wab/shared/Css";
import { isTplAutoSizable, resetTplSize } from "@/wab/shared/sizingutils";
import { SlotSelection } from "@/wab/slots";
import {
  isTplColumns,
  isTplImage,
  isTplNodeNamable,
  isTplTextBlock,
} from "@/wab/tpls";
import {
  isScrollableVal,
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
} from "@/wab/val-nodes";
import { notification } from "antd";
import { ArgsProps } from "antd/lib/notification";
import cn from "classnames";
import { throttle } from "lodash";
import { Observer, observer } from "mobx-react";
import * as React from "react";
import { memo, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use";
import { useHoverIntent } from "react-use-hoverintent";
import ResizeObserver from "resize-observer-polyfill";
import { failable } from "ts-failable";
import { PLATFORM } from "../../../platform";
import {
  computeHoverBoxTargets,
  computeHoverBoxViewState,
  getControlledSpacingObj,
  HoverBoxTarget,
  HoverBoxViewProps,
} from "./computeHoverBoxViewStates";
import { GapCanvasControls } from "./Controls/GapCanvasControls";
import { ImageCanvasControls } from "./Controls/ImageCanvasControls";
import {
  EdgeDragMode,
  getAffectedSides,
  SpaceEdgeControls,
  SpaceEdgeType,
} from "./draggable-edge";
import styles from "./HoverBox.module.scss";
import { InlineAddButton } from "./InlineAddButton";
import { ResponsiveColumnsCanvasControls } from "./ResponsiveColumnsCanvasControls";
import { SpacingVisualizer } from "./SpacingVisualizer";
import { StackOfParents } from "./StackOfParents";
import { VirtualScrollBar } from "./virtual-scrollbar";

const HoverBoxInner = memo(HoverBoxInner_);

function getObjResizability(
  controlledObj: ArenaFrame | undefined | ValNode | SlotSelection,
  viewCtx: ViewCtx | undefined
) {
  if (isKnownArenaFrame(controlledObj)) {
    return isHeightAutoDerived(controlledObj)
      ? {
          width: true,
          height: false,
        }
      : { width: true, height: true };
  }

  if (viewCtx) {
    return viewCtx.isFocusedResizable();
  }

  return { width: false, height: false };
}

const _throttledWarn = throttle(
  (args: ArgsProps) => notification.warn(args),
  5000,
  {
    trailing: false,
  }
);

interface SpacingEdgeDragState {
  edgeType: SpaceEdgeType;
  side: Side;
  mode: EdgeDragMode;
  unit: Unit;
  domElt: HTMLElement;
  initValue: number;
  dragDirectionFromZero: undefined | 1 | -1;
  tpl: TplNode;
}

let showedToast = false;

function HoverBoxInner_({ viewProps }: { viewProps: HoverBoxViewProps }) {
  const dragMoveManager = useRef<
    DragMoveManager | DragMoveFrameManager | undefined
  >(undefined);
  const plasmicCtx = usePlasmicCtx();
  const studioCtx = plasmicCtx.studioCtx;
  const viewCtx =
    plasmicCtx.viewCtx && !plasmicCtx.viewCtx.isDisposed
      ? plasmicCtx.viewCtx
      : undefined;
  const [resizePart, setResizePart] = useState<Side | Corner | undefined>();
  const [manipState, setManipState] = useState<ManipState>();
  const dimsBoxRef = useRef<HTMLDivElement>(null);
  const [dimsBoxWidth, setDimsBoxWidth] = useState(0);
  const [spacingDragState, setSpacingDragState] = React.useState<
    SpacingEdgeDragState | undefined
  >(undefined);

  const isMultiSelection = (viewCtx?.focusedSelectables().length || 0) > 1;

  const [suppressSpacingToast, setSuppressSpacingToast] = useLocalStorage(
    "HoverBox.suppressSpacingToast",
    false
  );

  const mkFreestyleManip = () =>
    failable<FreestyleManipulator, ManipulatorAbortedError>(
      ({ success, run }) => {
        const obj = studioCtx.hoverBoxControlledObj;
        if (isKnownArenaFrame(obj)) {
          return success(run(mkFreestyleManipForFocusedFrame(studioCtx, obj)));
        } else {
          return success(
            run(
              mkFreestyleManipForFocusedDomElt(
                ensure(
                  viewCtx,
                  () =>
                    `mkFreestyleManip is only called when there's a focused viewCtx`
                ),
                obj
              )
            )
          );
        }
      }
    );

  const startResize = (part: Corner | Side) => {
    const maybeManipulator = mkFreestyleManip();
    maybeManipulator.match({
      failure: () => {
        setResizePart(undefined);
        setManipState(undefined);
      },
      success: (manipulator) => {
        studioCtx.startUnlogged();
        studioCtx.isResizeDragging = true;
        setResizePart(part);
        setManipState(manipulator.start());
      },
    });
  };

  const dragResize = async (part: Corner | Side, e: XDraggableEvent) => {
    if (manipState) {
      const maybeAborted = await studioCtx.change<ManipulatorAbortedError>(
        ({ success, run }) => {
          setManipState(
            run(mkFreestyleManip()).resize(manipState, part, {
              deltaFrameX: Math.round(e.data.deltaX / studioCtx.zoom),
              deltaFrameY: Math.round(e.data.deltaY / studioCtx.zoom),
              shiftKey: e.mouseEvent.shiftKey,
              altKey: e.mouseEvent.altKey,
              metaKey: e.mouseEvent.metaKey,
              ctrlKey: e.mouseEvent.ctrlKey,
            })
          );
          return success();
        }
      );
      if (maybeAborted.result.isError) {
        await stopResize();
      }
    }
  };

  const stopResize = async () => {
    await studioCtx.changeUnsafe(() => {
      if (studioCtx.isUnlogged()) {
        studioCtx.stopUnlogged();
      }
      studioCtx.isResizeDragging = false;
      const obj = studioCtx.hoverBoxControlledObj;
      if (isKnownArenaFrame(obj)) {
        studioCtx.spreadNewFrameSize(obj);
      }

      setResizePart(undefined);
      setManipState(undefined);
    });
  };

  const clearSize = (part: Corner | Side) => {
    if (!viewCtx || studioCtx.focusedFrame()) {
      return;
    }
    const vtm = viewCtx.variantTplMgr();
    const val = ensureInstance(
      viewCtx.focusedSelectable(),
      ValTag,
      ValComponent
    );
    const tpl = val.tpl;

    // Skip if focused on the root element of a stretchy frame
    if (viewCtx.getViewOps().isRootNodeOfStretchFrame(tpl)) {
      return;
    }

    viewCtx.change(() => {
      sideOrCornerToSides(part).forEach((side) => {
        if (isTplAutoSizable(tpl, vtm, sideToSize(side))) {
          resetTplSize(tpl, vtm, sideToSize(side));
        }
      });
    });
  };

  const startMove = (e: XDraggableEvent) => {
    if (studioCtx.showStackOfParents) {
      studioCtx.showStackOfParents = false;
    }

    const clientPt = new Pt(e.mouseEvent.pageX, e.mouseEvent.pageY);
    const focusedObjects = studioCtx.hoverBoxControlledObjs;
    if (focusedObjects.length === 1 && isKnownArenaFrame(focusedObjects[0])) {
      if (isPositionManagedFrame(studioCtx, focusedObjects[0])) {
        return;
      }
      dragMoveManager.current = new DragMoveFrameManager(
        studioCtx,
        focusedObjects[0],
        clientPt
      );
    } else if (viewCtx && focusedObjects.length > 0) {
      const filteredFocusedObjects = (focusedObjects as Selectable[]).filter(
        (obj) => {
          return (
            (obj instanceof ValTag ||
              obj instanceof ValComponent ||
              obj instanceof ValSlot) &&
            !isTplTextBlock(obj.tpl.parent)
          );
        }
      );
      dragMoveManager.current = new DragMoveManager(
        viewCtx,
        filteredFocusedObjects as (ValTag | ValComponent | ValSlot)[],
        clientPt
      );
    }
    if (dragMoveManager.current && dragMoveManager.current.aborted()) {
      dragMoveManager.current = undefined;
    } else {
      studioCtx.setIsDraggingObject(true);
    }
  };

  const dragMove = async (e: XDraggableEvent) => {
    if (dragMoveManager.current) {
      if (dragMoveManager.current.aborted()) {
        await stopMove();
      } else {
        const clientPt = new Pt(e.mouseEvent.pageX, e.mouseEvent.pageY);
        await dragMoveManager.current.drag(clientPt, e.mouseEvent);
        if (dragMoveManager.current && dragMoveManager.current.aborted()) {
          await stopMove();
        }
      }
    }
  };

  const stopMove = async () => {
    await studioCtx.changeUnsafe(() => {
      if (dragMoveManager.current) {
        dragMoveManager.current.endDrag();
        dragMoveManager.current = undefined;
      }
      studioCtx.setIsDraggingObject(false);
      setManipState(undefined);
    });
  };
  const state = viewProps.displayProps;

  const focusedElt = viewCtx?.focusedDomElt()?.get()[0];

  const controlledObj = studioCtx.hoverBoxControlledObj;
  const controlledTpl =
    controlledObj instanceof ValNode ? controlledObj.tpl : undefined;
  const nameableItem =
    controlledObj &&
    (isKnownArenaFrame(controlledObj)
      ? controlledObj
      : controlledTpl && isTplNodeNamable(controlledTpl)
      ? controlledTpl
      : undefined);
  const controlledSpacingObj = maybe(viewCtx, (vc) =>
    getControlledSpacingObj(controlledObj, vc)
  );

  const resizable = getObjResizability(controlledObj, viewCtx);
  const selectable = viewCtx?.focusedSelectable();
  const isScrollable =
    selectable instanceof ValTag && isScrollableVal(selectable);

  const cssProps = cssPropsForInvertTransform(studioCtx.zoom, state);

  useEffect(() => {
    setDimsBoxWidth(dimsBoxRef.current ? dimsBoxRef.current.offsetWidth : 0);
  }, [state?.width, state?.height]);

  React.useEffect(() => {
    const listener = studioCtx.focusReset.add(
      spawnWrapper(async () => {
        if (manipState) {
          await stopResize();
        }
        if (dragMoveManager.current) {
          await stopMove();
        }
      })
    );

    return () => {
      listener.detach();
    };
  }, [studioCtx, manipState, dragMoveManager, stopMove, stopResize]);

  const [isEditingLabel, setEditingLabel] = useState(false);

  const tryShowingStackOfParents = () => {
    const selection = viewCtx?.focusedSelectable();
    const hasParents =
      selection &&
      !!SQ(selection, viewCtx!.valState(), false).parents().toArray().length;

    if (hasParents && !isEditingLabel) {
      studioCtx.showStackOfParents = true;
    }
  };

  const onClickNameTag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (PLATFORM === "osx" ? e.metaKey : e.ctrlKey) {
      // Show with Cmd+Click [Mac] OR Ctrl+Click [PC]
      // Current state doesn't matter
      tryShowingStackOfParents();
    } else if (studioCtx.showStackOfParents) {
      // Hide with simple click
      studioCtx.showStackOfParents = false;
    }
  };

  const onChangeEditingLabel = (editing: boolean) => {
    setEditingLabel(editing);
    studioCtx.showStackOfParents = false;
  };

  const [isHoveringTag, hoverTagRef] = useHoverIntent<HTMLDivElement>({
    timeout: 0,
    sensitivity: 10,
    interval: 100,
  });

  useEffect(() => {
    if (isHoveringTag) {
      tryShowingStackOfParents();
    }
  }, [isHoveringTag]);

  const shouldShowHoverTag =
    (!isKnownArenaFrame(nameableItem) ||
      isKnownArena(studioCtx.currentArena)) &&
    !spacingDragState;
  const shouldShowDimBadge = shouldShowHoverTag;

  // The controlledSpacingObj might be undefined if the component's artboard frame
  // view mode is set to `FrameViewMode.Centered`, if that is the case treat the
  // frame as not locked by default.
  const isLocked =
    viewCtx && controlledSpacingObj
      ? isSelectableLocked(controlledSpacingObj, viewCtx.valState())
      : false;

  const shouldShowSideControls =
    ((!DEVFLAGS.spacing && (resizable.width || resizable.height)) ||
      (DEVFLAGS.spacing &&
        ((state?.edgeControls.top.length ?? 0) > 0 ||
          (state?.edgeControls.right.length ?? 0) > 0 ||
          (state?.edgeControls.bottom.length ?? 0) > 0 ||
          (state?.edgeControls.left.length ?? 0) > 0))) &&
    !(controlledSpacingObj instanceof ValSlot) &&
    !isLocked &&
    !isMultiSelection &&
    !viewCtx?.editingTextContext();

  // TASK #27926: Show corner resizers for arena scratch artboards
  // and for component artboard when their viewmode is set to FrameViewMode.Centered.
  const canShowCornerResizers = false;

  return (
    <Observer>
      {() => {
        const showingMeasurements =
          !!viewCtx?.$measureToolDomElt() && !spacingDragState;

        return (
          <div
            className="hoverbox"
            onContextMenu={(e) => {
              if (viewCtx) {
                viewCtx.tryBlurEditingText();
                const menu = getContextMenuForFocusedTpl(viewCtx);
                maybeShowContextMenu(e.nativeEvent, menu);
              }
            }}
            data-original-width={state?.width}
            data-original-height={state?.height}
            style={{
              position: state?.position as any,
              top: state?.top,
              left: state?.left,
              display: viewProps.display,
              ...cssProps,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {
              <>
                {DEVFLAGS.spacingVisualizer202209 &&
                  shouldShowSideControls &&
                  (() => {
                    const anyEdge = state?.edgeControls.top;
                    const allowPadding = anyEdge?.includes("padding") ?? false;
                    const allowMargin = anyEdge?.includes("margin") ?? false;

                    return (
                      <SpacingVisualizer
                        allowPadding={allowPadding}
                        allowMargin={allowMargin}
                        paddingPx={state?.paddingPx}
                        marginPx={state?.marginPx}
                        zoom={studioCtx.zoom}
                      />
                    );
                  })()}

                {shouldShowHoverTag && (
                  <div className={styles.hoverBoxTagContainer}>
                    <StackOfParents hoverTagRef={hoverTagRef} />
                    <XDraggable
                      onStart={(e) => startMove(e)}
                      onDrag={(e) => dragMove(e)}
                      onStop={async () => stopMove()}
                    >
                      <div
                        ref={hoverTagRef}
                        className={cn("node-outline-tag", state?.tagPosClasses)}
                        onClick={onClickNameTag}
                      >
                        {state?.tagName && (
                          <EditableNodeLabel
                            onChangeEditing={onChangeEditingLabel}
                            studioCtx={studioCtx}
                            viewCtx={viewCtx}
                            displayName={state?.tagName}
                            icon={state?.tagIcon}
                            nameable={nameableItem}
                            isRepeated={state.isRepeated}
                          />
                        )}
                      </div>
                    </XDraggable>
                  </div>
                )}
                <div
                  className={cn({
                    HoverBox__Border: true,
                    "HoverBox__Border--autoWidth": state && state.autoWidth,
                    "HoverBox__Border--autoHeight": state && state.autoHeight,
                    "HoverBox__Border--isSlot": state && state.isSlot,
                  })}
                />
                <div className={"HoverBox__Controls"}>
                  <div
                    className="HoverBox__Resizers"
                    style={
                      DEVFLAGS.spacingVisualizer202209
                        ? ({
                            "--selected-element-margin-top": `${
                              (state?.marginPx?.top ?? 0) * studioCtx.zoom
                            }px`,
                            "--selected-element-margin-bottom": `${
                              (state?.marginPx?.bottom ?? 0) * studioCtx.zoom
                            }px`,
                            "--selected-element-margin-left": `${
                              (state?.marginPx?.left ?? 0) * studioCtx.zoom
                            }px`,
                            "--selected-element-margin-right": `${
                              (state?.marginPx?.right ?? 0) * studioCtx.zoom
                            }px`,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {shouldShowSideControls &&
                      sidesAndCorners({
                        ...(canShowCornerResizers
                          ? {
                              corner: (corner) =>
                                state?.edgeControls["top"].includes("size") &&
                                state?.edgeControls["bottom"].includes(
                                  "size"
                                ) &&
                                state?.edgeControls["left"].includes("size") &&
                                state?.edgeControls["right"].includes("size") &&
                                resizable.width &&
                                resizable.height && (
                                  <XDraggable
                                    key={corner}
                                    onStart={(_e) => startResize(corner)}
                                    onDrag={(e) => dragResize(corner, e)}
                                    onStop={() => stopResize()}
                                  >
                                    <div
                                      onDoubleClick={() => clearSize(corner)}
                                      className={cn({
                                        HoverBox__Resizer: true,
                                        [`HoverBox__Resizer__${styleCase(
                                          corner
                                        )}`]: true,
                                      })}
                                    />
                                  </XDraggable>
                                ),
                            }
                          : undefined),
                        side: (side) => {
                          const isVertical = isAxisSide(side, "width");
                          const isHorizontal = isAxisSide(side, "height");
                          const allowPadding =
                            state?.edgeControls[side].includes("padding");
                          const allowMargin =
                            state?.edgeControls[side].includes("margin");
                          const allowSizing =
                            state?.edgeControls[side].includes("size") &&
                            ((isVertical && resizable.width) ||
                              (isHorizontal && resizable.height));
                          const disabledDnd = !canEditSection(
                            studioCtx,
                            Section.Spacing
                          );
                          return DEVFLAGS.spacing ? (
                            <SpaceEdgeControls
                              side={side}
                              paddingLabel={
                                allowPadding
                                  ? maybe(
                                      state?.padding?.[side],
                                      (size) => `${showSizeCss(size)}`
                                    )
                                  : null
                              }
                              marginLabel={
                                allowMargin
                                  ? maybe(
                                      state?.margin?.[side],
                                      (size) => `${showSizeCss(size)}`
                                    )
                                  : null
                              }
                              paddingPxValue={
                                allowPadding
                                  ? state?.paddingPx?.[side] ?? 0
                                  : null
                              }
                              marginPxValue={
                                allowMargin
                                  ? state?.marginPx?.[side] ?? 0
                                  : null
                              }
                              sizePxValue={
                                allowSizing ? state?.[side] ?? 0 : null
                              }
                              draggedSide={spacingDragState?.side}
                              draggedEdgeType={spacingDragState?.edgeType}
                              zoom={studioCtx.zoom}
                              isAffectedSide={
                                !!spacingDragState &&
                                getAffectedSides(
                                  spacingDragState.side,
                                  spacingDragState.mode
                                ).includes(side)
                              }
                              isAutoSized={
                                sideToOrient(side) === "horiz"
                                  ? state?.autoWidth
                                  : state?.autoHeight
                              }
                              childAlign={
                                state?.containerChildAlignment[
                                  sideToOrient(side)
                                ]
                              }
                              showMeasurements={showingMeasurements}
                              focusedHeight={state?.height}
                              focusedWidth={state?.width}
                              onDragStart={async (side2, edgeType) => {
                                await studioCtx.change(({ success }) => {
                                  if (edgeType === "size") {
                                    startResize(side2);
                                    return success();
                                  } else {
                                    if (!viewCtx || !controlledSpacingObj) {
                                      return success();
                                    }
                                    const val = maybe(
                                      controlledSpacingObj,
                                      (focused) =>
                                        ensureInstance(
                                          focused,
                                          ValTag,
                                          ValComponent
                                        )
                                    );
                                    if (!val) {
                                      return success();
                                    }
                                    const domElt = ensureArray(
                                      viewCtx.renderState.sel2dom(
                                        val,
                                        viewCtx.canvasCtx
                                      )
                                    )[0] as HTMLElement;
                                    studioCtx.startUnlogged();
                                    studioCtx.isResizeDragging = true;
                                    const initValue =
                                      state?.[`${edgeType}Px`]?.[side2] ?? 0;
                                    setSpacingDragState({
                                      side: side2,
                                      edgeType,
                                      mode: "single",
                                      domElt,
                                      unit:
                                        state?.[edgeType]?.[side2]?.unit ??
                                        "px",
                                      tpl: val.tpl,
                                      initValue,
                                      dragDirectionFromZero: undefined,
                                    });
                                    if (!showedToast && !suppressSpacingToast) {
                                      showedToast = true;
                                      toast(
                                        <div>
                                          Hold down{" "}
                                          <OneShortcutCombo combo="alt" /> or{" "}
                                          <OneShortcutCombo combo="shift" /> to
                                          update more than one side at a time
                                          <br />(
                                          <LinkButton
                                            onClick={() => {
                                              setSuppressSpacingToast(true);
                                              notification.close("spacing");
                                            }}
                                          >
                                            never show again
                                          </LinkButton>
                                          )
                                        </div>,
                                        {
                                          duration: 999,
                                          key: "spacing",
                                        }
                                      );
                                    }
                                    return success();
                                  }
                                });
                              }}
                              onDrag={async (side2, edgeType, delta, mode) => {
                                if (edgeType === "size") {
                                  if (!manipState) {
                                    return;
                                  }
                                  const maybeAborted =
                                    await studioCtx.change<ManipulatorAbortedError>(
                                      ({ success, run }) => {
                                        const isVertical2 =
                                          side2 === "left" || side2 === "right";
                                        setManipState(
                                          run(mkFreestyleManip()).resize(
                                            manipState,
                                            side2,
                                            {
                                              deltaFrameX: isVertical2
                                                ? (side2 === "left" ? -1 : 1) *
                                                  Math.round(delta)
                                                : 0,
                                              deltaFrameY: isVertical2
                                                ? 0
                                                : (side2 === "top" ? -1 : 1) *
                                                  Math.round(delta),
                                              shiftKey: mode === "all",
                                              altKey: mode === "symmetric",
                                              metaKey: false,
                                              ctrlKey: false,
                                            }
                                          )
                                        );
                                        return success();
                                      }
                                    );
                                  if (maybeAborted.result.isError) {
                                    await stopResize();
                                  }
                                } else {
                                  if (!spacingDragState) {
                                    return;
                                  }
                                  await studioCtx.changeUnsafe(() => {
                                    const { initValue, dragDirectionFromZero } =
                                      spacingDragState;
                                    const newValue =
                                      initValue === 0 &&
                                      dragDirectionFromZero === undefined &&
                                      edgeType === "padding"
                                        ? Math.abs(delta)
                                        : initValue +
                                          (dragDirectionFromZero ?? 1) * delta;
                                    const frameOffset = Math.max(0, newValue);
                                    const newNumericValue = offsetPxAsUnits(
                                      spacingDragState.domElt,
                                      spacingDragState.unit,
                                      frameOffset,
                                      "width",
                                      0
                                    );
                                    const newUnitValue = showSizeCss(
                                      createNumericSize(
                                        newNumericValue,
                                        spacingDragState.unit
                                      )
                                    );
                                    const vtm = ensure(
                                      viewCtx,
                                      () =>
                                        `Only possible to resize if there's a focused viewCtx`
                                    ).variantTplMgr();
                                    const expr = vtm.targetRshForNode(
                                      spacingDragState.tpl
                                    );
                                    for (const s of getAffectedSides(
                                      side2,
                                      mode
                                    )) {
                                      expr.set(
                                        `${edgeType}-${s}`,
                                        newUnitValue
                                      );
                                    }

                                    if (spacingDragState.mode !== mode) {
                                      setSpacingDragState({
                                        ...spacingDragState,
                                        mode,
                                      });
                                    }
                                    if (
                                      initValue === 0 &&
                                      dragDirectionFromZero === undefined &&
                                      edgeType === "padding" &&
                                      delta !== 0
                                    ) {
                                      setSpacingDragState({
                                        ...spacingDragState,
                                        dragDirectionFromZero:
                                          delta > 0 ? 1 : -1,
                                      });
                                    }
                                  });
                                }
                              }}
                              onDragStop={async (side2, edgeType) => {
                                if (edgeType === "size") {
                                  await stopResize();
                                } else {
                                  await studioCtx.change(({ success }) => {
                                    setSpacingDragState(undefined);
                                    studioCtx.stopUnlogged();
                                    studioCtx.isResizeDragging = false;
                                    return success();
                                  });
                                  setTimeout(
                                    () => notification.close("spacing"),
                                    3000
                                  );
                                }
                              }}
                              onHover={() => {}}
                              onDoubleClick={async (side2, edgeType) => {
                                if (edgeType === "size") {
                                  clearSize(side2);
                                } else {
                                  if (!viewCtx || !controlledSpacingObj) {
                                    return;
                                  }
                                  await studioCtx.changeUnsafe(() => {
                                    const val = ensureInstance(
                                      controlledSpacingObj,
                                      ValTag,
                                      ValComponent
                                    );
                                    const vtm = ensure(
                                      viewCtx,
                                      () =>
                                        `Only possible to resize when there's a focused viewCtx`
                                    ).variantTplMgr();
                                    const expr = vtm.targetRshForNode(val.tpl);
                                    if (expr.has(`${edgeType}-${side2}`)) {
                                      expr.clear(`${edgeType}-${side2}`);
                                    } else {
                                      expr.set(`${edgeType}-${side2}`, "0px");
                                    }
                                  });
                                }
                              }}
                              showSquare={!canShowCornerResizers && allowSizing}
                              disabledDnd={disabledDnd}
                            />
                          ) : (
                            ((isVertical && resizable.width) ||
                              (isHorizontal && resizable.height)) && (
                              <XDraggable
                                key={side}
                                onStart={(_e) => startResize(side)}
                                onDrag={(e) => dragResize(side, e)}
                                onStop={async () => stopResize()}
                              >
                                <div
                                  onDoubleClick={() => clearSize(side)}
                                  className={cn({
                                    HoverBox__Resizer: true,
                                    HoverBox__Resizer__Scrollable: isScrollable,
                                    [`HoverBox__Resizer__${styleCase(side)}`]:
                                      true,
                                    [`HoverBox__Resizer__${
                                      isVertical ? "Vertical" : "Horizontal"
                                    }`]: true,
                                  })}
                                />
                              </XDraggable>
                            )
                          );
                        },
                      })}
                  </div>
                </div>
                {focusedElt && viewCtx && (
                  <>
                    <VirtualScrollBar element={focusedElt} axis={"vertical"} />
                    <VirtualScrollBar
                      element={focusedElt}
                      axis={"horizontal"}
                    />
                  </>
                )}
                {state && shouldShowDimBadge && (
                  <div ref={dimsBoxRef} className={"HoverBox__Dims"}>
                    {Math.round(state.width)} × {Math.round(state.height)}
                  </div>
                )}
                {resizePart && (
                  <div
                    className={cn({
                      HoverBox__DragGuard: true,
                      [`HoverBox__DragGuard__${styleCase(resizePart)}`]: true,
                    })}
                  />
                )}
                {state &&
                  viewCtx &&
                  controlledTpl &&
                  isTplColumns(controlledTpl) && (
                    <ResponsiveColumnsCanvasControls
                      viewCtx={viewCtx}
                      tpl={controlledTpl}
                    />
                  )}
                {DEVFLAGS.gapControls && state && viewCtx && (
                  <GapCanvasControls viewCtx={viewCtx} />
                )}
                {DEVFLAGS.imageControls &&
                  state &&
                  viewCtx &&
                  controlledTpl &&
                  isTplImage(controlledTpl) && (
                    <ImageCanvasControls
                      viewCtx={viewCtx}
                      tpl={controlledTpl}
                    />
                  )}
              </>
            }
            <InlineAddButton
              elementWidth={state?.width}
              elementHeight={state?.height}
              dimensionsBoxWidth={dimsBoxWidth}
              key={state?.tagUid}
            />
          </div>
        );
      }}
    </Observer>
  );
}

export const HoverBox = observer(HoverBox_);
function HoverBox_({
  viewCtx,
  target,
}: {
  viewCtx: ViewCtx;
  target: HoverBoxTarget;
}) {
  const forceUpdate = useForceUpdate();

  const focusedElt = !isKnownArenaFrame(target) ? target.node : undefined;
  const viewProps = computeHoverBoxViewState(viewCtx, target);

  React.useEffect(() => {
    // Subscribe to events that may cause HoverBoxes to need to re-render
    // as underlying DOM elements may have changed in size or location
    const stylesListener = viewCtx.studioCtx.styleChanged.add(forceUpdate);
    const framesListener = viewCtx.studioCtx.framesChanged.add(forceUpdate);

    return () => {
      stylesListener.detach();
      framesListener.detach();
    };
  }, [viewCtx.studioCtx]);

  React.useEffect(() => {
    if (focusedElt && focusedElt.length > 0) {
      const focusedEltParentObserver = new ResizeObserver(forceUpdate);
      const elts = focusedElt.toArray();
      elts.forEach((elt) => focusedEltParentObserver.observe(elt));

      // Observes if the element gets disconnected from the DOM
      const eltsSet = new Set(elts);
      const parentObs = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const el of mutation.removedNodes) {
            if (eltsSet.has(el as any)) {
              viewCtx?.recomputeFocusedDomElts();
            }
          }
        }
      });
      elts.forEach(
        (elt) =>
          elt.parentNode &&
          parentObs.observe(elt.parentNode, { childList: true })
      );

      return () => {
        focusedEltParentObserver.disconnect();
        parentObs.disconnect();
      };
    } else {
      return undefined;
    }
  }, [focusedElt]);

  return <HoverBoxInner viewProps={viewProps} />;
}

export const HoverBoxes = observer(HoverBoxes_);
function HoverBoxes_(props: { studioCtx: StudioCtx }) {
  const { studioCtx } = props;

  const viewCtx = studioCtx.focusedViewCtx();

  const shouldHideHoverBox =
    studioCtx.freestyleState() ||
    studioCtx.dragInsertState() ||
    studioCtx.isResizingFocusedArenaFrame ||
    !studioCtx.showDevControls ||
    studioCtx.screenshotting ||
    studioCtx.isTransforming() ||
    !viewCtx;

  const forceUpdate = useForceUpdate();

  // With React 18, sometimes rendering won't be done in time for a newly-inserted
  // tpl to be rendered and its DOM element set. So we need to monitor the
  // artboard root for DOM mutations, and select the proper DOM element once
  // rendered.
  // https://app.shortcut.com/plasmic/story/23379/urgent-selection-is-not-appearing-for-newly-inserted-pasted-moved-elements
  const userBody = viewCtx?.canvasCtx.$userBody()?.[0];
  React.useEffect(() => {
    if (!userBody || !viewCtx) {
      return;
    }

    const userBodyObserver = new MutationObserver((_mutations) => {
      // Because the selected element may now be present, we try to recompute
      // focus on it
      const updated = viewCtx.recomputeFocusedDomElts();
      if (!updated) {
        // If new DOM elements are now focused, then HoverBox will re-render.
        // But even if not, we want to force an update here, because the
        // DOM may have been updated such that the old position is stale
        // (for example, if hoverbox is on 10th, we press delete, and it's
        // now on the next item, Hoverbox will be rendering where that next
        // item used to be rather than where it is now). This is also only
        // for React 18 :-/
        forceUpdate();
      }
    });
    userBodyObserver.observe(userBody, {
      subtree: true,
      childList: true,
    });
    return () => userBodyObserver.disconnect();
  }, [viewCtx, userBody]);

  const targets = computeHoverBoxTargets(studioCtx);
  return shouldHideHoverBox ? null : (
    <>
      {targets.map((target, i) => (
        <HoverBox key={i} viewCtx={viewCtx!} target={target} />
      ))}
    </>
  );
}
