import styles from "@/wab/client/components/style-controls/GridEditor.module.scss";
import { getRect } from "@/wab/client/dom";
import { Dict } from "@/wab/collections";
import { ensure, parsePx, zipWithIndex } from "@/wab/common";
import { ClientRect } from "@/wab/geom";
import { Axis, Offset } from "@/wab/shared/Grids";
import { px } from "@/wab/styles";
import $ from "jquery";
import L from "lodash";
import { CSSProperties } from "react";

function ensureValues<T>(x: Dict<T | null | undefined>): Dict<T> {
  for (const k in x) {
    if (!x[k]) {
      throw new Error();
    }
  }
  return x as Dict<T>;
}

interface MeasuredAxis {
  readonly tracks: ReadonlyArray<number>;
  readonly gap: number;
  /**
   * Whether controls should be flipped to the end of the grid (bottom or right
   * of the grid).  This happens when, e.g., there's not enough space to render
   * the controls above the grid (because the grid is at the top of the page),
   * but there is enough space below the grid (the grid isn't taking up the full
   * page).
   */
  readonly isAtEnd: boolean;
  /**
   * Whether controls should be flipped to be inside the grid, overlapping the
   * content.  This happens when e.g. a grid takes up the full height of the
   * page.  This can be true only when isAtEnd is false; isAtEnd takes
   * precedence.
   */
  readonly isInset: boolean;
}

export interface MeasuredGrid {
  readonly rect: ClientRect;
  readonly style: Partial<CSSProperties>;
  readonly rows: MeasuredAxis;
  readonly cols: MeasuredAxis;
}

/**
 * A lane is a track + its surrounding half-gap-sized gutters (but the first
 * and last have just gutter on one side).
 */
interface Lane {
  readonly startOffset: number;
  readonly size: number;
  readonly trackSize: number;
  readonly endOffset: number;
  readonly hasStartGutter: boolean;
  readonly hasEndGutter: boolean;
}

const makeMimicGridStyle = (
  computed: Dict<string>,
  scale: number
): Dict<string> => {
  if (!computed.display) {
    return {};
  }
  const getTrackPixels = (axis: string) =>
    axis.split(" ").map((word) => parsePx(word));
  const scalePixelString = (size: string | null | undefined) =>
    px(parsePx(ensure(size, () => `Unexpected nullish size`)) * scale);
  return {
    display: computed.display,
    gridTemplateRows: getTrackPixels(
      ensure(
        computed.gridTemplateRows,
        () => `Unexpected nullish griTemplateRows`
      )
    )
      .map((v) => px(v * scale))
      .join(" "),
    gridTemplateColumns: getTrackPixels(
      ensure(
        computed.gridTemplateColumns,
        () => `Unexpected nullish gridTemplateColumns`
      )
    )
      .map((v) => px(v * scale))
      .join(" "),
    gridRowGap: scalePixelString(computed.gridRowGap),
    gridColumnGap: scalePixelString(computed.gridColumnGap),
    width: scalePixelString(computed.width),
    height: scalePixelString(
      ensure(computed.height, () => `Unexpected nullish height`)
    ),
  };
};

export function adjustGridStyleForCurZoom(curZoom: number) {
  const $gridControl = $(`.${styles.GridControls}`);
  if ($gridControl.length === 0 || $gridControl.css("display") === "none") {
    return;
  }
  $gridControl.css({ transform: `scale(${1 / curZoom})` });
  const originalStyleAttr = "data-original-style";
  const $mimicGrid = $gridControl.find(`.${styles.MimicGrid}`);
  const originalGridStyle = JSON.parse(
    ensure(
      $mimicGrid.attr(originalStyleAttr),
      () => `Unexpected nullish originalStyleAttr: ${originalStyleAttr}`
    )
  );
  $mimicGrid.css(makeMimicGridStyle(originalGridStyle, curZoom));

  const classesToScalePosStyle = [
    styles.LaneHeader,
    styles.Gap,
    styles.TrackHandleContainer,
    styles.TrackInserterBeam,
    styles.TrackHoverHighlight,
    styles.MeasureRotator,
    "LaneHeadersContainer",
  ]
    .map((c) => `.${c}`)
    .join(", ");

  $gridControl.find(classesToScalePosStyle).each((index, elem) => {
    const $e = $(elem);
    const style = JSON.parse(
      ensure(
        $e.attr(originalStyleAttr),
        () => `Unexpected nullish originalStyleAttr: ${originalStyleAttr}`
      )
    );
    for (const k in style) {
      style[k] *= curZoom;
    }
    $e.css(style);
  });
}

export function measureGrid(subj: HTMLElement) {
  const computed = ensureValues(
    L.pick(
      getComputedStyle(subj),
      "gridTemplateRows",
      "gridTemplateColumns",
      "gridRowGap",
      "gridColumnGap",
      "width",
      "height",
      "display"
    )
  );
  const getTrackPixels = (axis: string) =>
    axis.split(" ").map((word) => parsePx(word));

  const rect = getRect(subj);
  const pageRect = getRect(
    ensure(subj.ownerDocument, () => `ownerDocument is nullish`).documentElement
  );
  const isAtLeft = rect.left < 40;
  const isAtTop = rect.top < 40;
  const isAtRight = pageRect.right - rect.right < 40;
  const isAtBottom = pageRect.bottom - rect.bottom < 40;
  const measured = {
    rect: rect,
    style: computed,
    rows: {
      gap: parsePx(computed.gridRowGap),
      tracks: getTrackPixels(computed.gridTemplateRows),
      isAtEnd: isAtLeft && !isAtRight,
      isInset: isAtLeft && isAtRight,
    },
    cols: {
      gap: parsePx(computed.gridColumnGap),
      tracks: getTrackPixels(computed.gridTemplateColumns),
      isAtEnd: isAtTop && !isAtBottom,
      isInset: isAtTop && isAtBottom,
    },
  };
  return measured;
}

interface MousePos {
  pageX: number;
  pageY: number;
}

/**
 * @param mode If track, then return the track row/col that the mouse is in
 *   (undefined if in gap). If line, then return the closest line row/col to
 *   the mouse.
 */
export function findRowColForMouse(
  e: MousePos,
  mode: "track" | "line",
  measured: MeasuredGrid,
  zoom: number,
  viewportOffset: Offset
) {
  function* genLanes(measuredAxis: MeasuredAxis): IterableIterator<Lane> {
    let offset = 0;
    for (const [trackSize, i] of zipWithIndex(measuredAxis.tracks)) {
      const isFirst = i === 0;
      const isLast = i === measuredAxis.tracks.length - 1;
      const isFirstOrLast = isFirst || isLast;
      const nextOffset =
        offset +
        trackSize +
        (isFirstOrLast ? measuredAxis.gap / 2 : measuredAxis.gap);
      yield {
        startOffset: offset,
        endOffset: nextOffset,
        size: nextOffset - offset,
        trackSize,
        hasEndGutter: !isLast,
        hasStartGutter: !isFirst,
      };
      offset = nextOffset;
    }
  }
  const lanes = {
    rows: Array.from(genLanes(measured.rows)),
    cols: Array.from(genLanes(measured.cols)),
  };

  const mouseYInFrame =
    (e.pageY - viewportOffset.top) / zoom - measured.rect.top;
  const mouseXInFrame =
    (e.pageX - viewportOffset.left) / zoom - measured.rect.left;
  if (mode === "track") {
    const row = lanes.rows.findIndex(
      (lane) =>
        lane.endOffset - (+lane.hasEndGutter * measured.rows.gap) / 2 >=
        mouseYInFrame
    );
    const col = lanes.cols.findIndex(
      (lane) =>
        lane.endOffset - (+lane.hasEndGutter * measured.cols.gap) / 2 >=
        mouseXInFrame
    );
    return { row, col };
  } else {
    const findLine = (axis: Axis, mousePos: number) => {
      // Simply split lanes into midpoints.  Ignores gaps.
      const midpoints = lanes[axis].map(
        (lane) => (lane.startOffset + lane.endOffset) / 2
      );
      // This should return 0 if before the first midpoint, and the last index if after the last midpoint.
      return [...midpoints, Number.POSITIVE_INFINITY].findIndex(
        (midpoint) => midpoint > mousePos
      );
    };
    return {
      row: findLine("rows", mouseYInFrame),
      col: findLine("cols", mouseXInFrame),
    };
  }
}
