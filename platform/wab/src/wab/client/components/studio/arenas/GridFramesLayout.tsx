import { observer } from "mobx-react-lite";
import React from "react";
import {
  ArenaFrame,
  ArenaFrameGrid,
  ArenaFrameRow,
  ComponentArena,
  PageArena,
} from "../../../../classes";
import { cx, maybe, switchType } from "../../../../common";
import { AnyArena, getFrameHeight } from "../../../../shared/Arenas";
import { StudioCtx, useStudioCtx } from "../../../studio-ctx/StudioCtx";
import { CanvasCtx } from "../../canvas/canvas-ctx";
import { CanvasFrame } from "../../canvas/CanvasFrame";
import sty from "./GridFramesLayout.module.sass";

export const GridFramesLayout = observer(GridFramesLayout_);
function GridFramesLayout_(props: {
  arena: AnyArena;
  grid: ArenaFrameGrid;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
  makeRowLabel?: (row: ArenaFrameRow, index: number) => React.ReactNode;
  makeRowLabelControls?: (row: ArenaFrameRow, index: number) => React.ReactNode;
  rowEndControls?: (row: ArenaFrameRow, index: number) => React.ReactNode;
  gridEndControls?: () => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const {
    arena,
    grid,
    onFrameLoad,
    makeRowLabel,
    makeRowLabelControls,
    className,
    style,
    rowEndControls,
    gridEndControls,
  } = props;

  const studioCtx = useStudioCtx();

  return (
    <div
      className={cx([sty.root, className], {
        [sty.root__withRowLabels]: !!makeRowLabel,
      })}
      style={style}
    >
      {grid.rows.map((row, rowIndex) => (
        <div key={row.rowKey?.uuid ?? rowIndex}>
          <ArenaGridRowLabel
            studioCtx={studioCtx}
            arena={arena}
            key={`label-${row.rowKey?.uuid ?? rowIndex}`}
          >
            {makeRowLabel?.(row, rowIndex)}
            {makeRowLabelControls?.(row, rowIndex)}
          </ArenaGridRowLabel>
          {row.cols.map((cell, index) => (
            // It is necessary to encode the `index` in the key CanvasFrame key here,
            // so that upon reordering variants, the CanvasFrame components are unmounted
            // and mounted again. The reason is that if they have a stable key, then the
            // component won't be re-rendered, but React will manipulate the DOM elements to
            // match the right order; however, when an iframe is detached from the DOM, its
            // content is reset, so we end up with an empty iframe!
            <CanvasFrame
              key={`${cell.frame.uid}-${index}`}
              studioCtx={studioCtx}
              arena={arena}
              onFrameLoad={onFrameLoad}
              arenaFrame={cell.frame}
              isFree={false}
            />
          ))}
          {rowEndControls && (
            <div key={`controls-${row.rowKey?.uuid ?? rowIndex}`}>
              {rowEndControls(row, rowIndex)}
            </div>
          )}
        </div>
      ))}
      {gridEndControls && (
        <div key="end-row">
          <ArenaGridRowLabel
            arena={arena}
            studioCtx={studioCtx}
            key={`end-label`}
          >
            {null}
          </ArenaGridRowLabel>
          {gridEndControls()}
        </div>
      )}
    </div>
  );
}

export const ArenaGridRowLabel = observer(ArenaGridRowLabel_);
function ArenaGridRowLabel_(props: {
  arena: AnyArena;
  studioCtx: StudioCtx;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { studioCtx, children, style, className } = props;

  const minRowHeight = switchType(props.arena)
    .when(ComponentArena, (arena) =>
      maybe(arena.matrix.rows[0]?.cols[0]?.frame, (frame) =>
        getFrameHeight(frame)
      )
    )
    .when(PageArena, (arena) =>
      Math.min.call(
        null,
        ...arena.matrix.rows.map((row) =>
          Math.max.call(
            null,
            ...row.cols.map((col) => getFrameHeight(col.frame))
          )
        )
      )
    )
    .elseUnsafe(() => 300);

  return (
    <div
      className={cx(sty.rowLabel, className)}
      style={{
        transform: `scale(${Math.min(
          1 / studioCtx.zoom,
          minRowHeight / 27 /* label line-height */
        )})`,
        ...style,
      }}
    >
      <div className={sty.rowLabelInner}>{children}</div>
    </div>
  );
}
