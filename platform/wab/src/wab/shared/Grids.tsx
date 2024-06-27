import { betweenInclusive, ensureString } from "@/wab/shared/common";
import { NumericSize, Size, autoSize, showSizeCss } from "@/wab/shared/css-size";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantCombo, ensureVariantSetting } from "@/wab/shared/Variants";
import { gridChildProps } from "@/wab/shared/core/style-props";
import { convertToRelativePosition } from "@/wab/shared/layoututils";
import { TplNode, TplTag } from "@/wab/shared/model/classes";
import * as L from "lodash";
import { CSSProperties } from "react";

export type Axis = "rows" | "cols";
export const axes: ["rows", "cols"] = ["rows", "cols"];

export interface Track {
  readonly size: Size;
}

export interface AxisSpec {
  readonly tracks: ReadonlyArray<Track>;
  readonly gap: NumericSize;
  readonly autoSize: Size;
}

export interface GridSpec {
  readonly rows: AxisSpec;
  readonly cols: AxisSpec;
}

export const defaultTrackByAxis: { rows: Track; cols: Track } = {
  rows: {
    size: autoSize,
  },
  cols: {
    size: { type: "NumericSize", num: 1, unit: "fr" },
  },
};

export function createGridSpec(): GridSpec {
  function createAxisSpec(axis: Axis): AxisSpec {
    return {
      tracks: [defaultTrackByAxis[axis], defaultTrackByAxis[axis]],
      gap: { type: "NumericSize", num: 16, unit: "px" },
      autoSize: defaultTrackByAxis[axis].size,
    };
  }

  return {
    rows: createAxisSpec("rows"),
    cols: createAxisSpec("cols"),
  };
}

const emptyTrackSize = "75px";

interface TrackArrays<T> {
  readonly rows: ReadonlyArray<T>;
  readonly cols: ReadonlyArray<T>;
}

export interface Offset {
  readonly top: number;
  readonly left: number;
}

/**
 * @param spec
 * @param emptyTracks
 *   Bitmask of whether row i is an empty row.
 *   Being set indicates whether to keep propped open empty rows that have auto
 *   height (note: not called "auto rows" which are a different concept).
 */
export function showGridCss(
  spec: GridSpec,
  emptyTracks?: TrackArrays<boolean>
): CSSProperties {
  function showTracksCss(axis: Axis, tracks: ReadonlyArray<Track>) {
    return tracks
      .map((track, trackNum) =>
        emptyTracks &&
        track.size.type === "KeywordSize" &&
        track.size.value === "auto" &&
        emptyTracks[axis][trackNum]
          ? emptyTrackSize
          : showSizeCss(track.size)
      )
      .join(" ");
  }

  return {
    display: "grid",
    gridTemplateRows: showTracksCss("rows", spec.rows.tracks),
    gridTemplateColumns: showTracksCss("cols", spec.cols.tracks),
    gridRowGap: showSizeCss(spec.rows.gap),
    gridColumnGap: showSizeCss(spec.cols.gap),
    gridAutoRows: showSizeCss(spec.rows.autoSize),
    gridAutoColumns: showSizeCss(spec.cols.autoSize),
  };
}

export interface TrackRange {
  /** Indicates a track number, not a line number! */
  readonly start: number;
  /** Indicates a track number, not a line number! */
  readonly end: number;
}

export interface Area {
  readonly rows: TrackRange;
  readonly cols: TrackRange;
}

export function withinArea(
  rowNum: number,
  colNum: number,
  area: Area
): boolean {
  return (
    betweenInclusive(rowNum, area.rows.start, area.rows.end) &&
    betweenInclusive(colNum, area.cols.start, area.cols.end)
  );
}

export interface Child {
  readonly id: string;
  readonly area: Area;
}

/**
 * Simply converts line number specs to track specs.  Any `auto` become 0.
 */
export function parseGridChildAreaCss(
  props: CSSProperties | CSSStyleDeclaration
): Area {
  const [rowStart, rowEnd] = L.words(ensureString(props.gridRow));
  const [colStart, colEnd] = L.words(ensureString(props.gridColumn));
  return {
    rows: {
      start: +rowStart - 1 || 0,
      end: +rowEnd - 2 || 0,
    },
    cols: {
      start: +colStart - 1 || 0,
      end: +colEnd - 2 || 0,
    },
  };
}

export function showGridChildCss(child: Child): CSSProperties {
  return {
    gridRow: `${child.area.rows.start + 1} / ${child.area.rows.end + 2}`,
    gridColumn: `${child.area.cols.start + 1} / ${child.area.cols.end + 2}`,
  };
}

export function convertToGridChildren(
  parent: TplNode,
  variantCombo: VariantCombo
) {
  const tags = $$$(parent).children().toArrayOfTplNodes() as TplTag[];

  tags.forEach((tag) => {
    const rs = ensureVariantSetting(tag, variantCombo).rs;
    const childRsh = RSH(rs, tag);
    convertToRelativePosition(childRsh, childRsh);
  });
}

export function adjustAllGridChildren(parent: TplNode) {
  parent.vsettings.forEach((vs) => {
    convertToGridChildren(parent, vs.variants);
  });
}

export function removeGridChildProps(tag: TplNode, variantCombo: VariantCombo) {
  const rs = ensureVariantSetting(tag, variantCombo).rs;
  const rsh = RSH(rs, tag);
  rsh.clearAll(gridChildProps);
}

export function removeAllGridChildProps(parent: TplNode) {
  const tags = $$$(parent).children().toArrayOfTplNodes() as TplTag[];
  tags.forEach((tag) => {
    tag.vsettings.forEach((vs) => {
      removeGridChildProps(tag, vs.variants);
    });
  });
}

export function getAxisLabel(axis: Axis) {
  return axis === "rows" ? "row" : "column";
}

export function getAxisAbbrevLabel(axis: Axis) {
  return axis === "rows" ? "row" : "col";
}
