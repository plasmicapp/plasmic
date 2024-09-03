import GridStyleParser from "@/wab/gen/GridStyleParser";
import {
  ReadonlyIRuleSetHelpers,
  readonlyRSH,
} from "@/wab/shared/RuleSetHelpers";
import { ensure } from "@/wab/shared/common";
import { CssVarResolver, expandRuleSets } from "@/wab/shared/core/styles";
import { isTplTag } from "@/wab/shared/core/tpls";
import { NumericSize, Size } from "@/wab/shared/css-size";
import { TplNode } from "@/wab/shared/model/classes";
import { isArray, last } from "lodash";

export interface FlexibleSize {
  readonly type: "FlexibleSize";
  readonly size: NumericSize;
}

export interface FixedSize {
  readonly type: "FixedSize";
  readonly num: number;
}

export interface Track {
  readonly size: Size;
}

export interface GridSpec {
  readonly gridTemplateColumns?:
    | ReadonlyArray<Track>
    | FlexibleSize
    | FixedSize;
}

export const GRID_DEFAULT_TEMPLATE: FixedSize = {
  type: "FixedSize",
  num: 2,
};

export function parseGridCssPropsToSpec(
  rsh: ReadonlyIRuleSetHelpers,
  resolver: CssVarResolver
): GridSpec {
  const parseProp = (prop: string, startRule: string) => {
    if (!rsh.has(prop)) {
      return undefined;
    }
    const value = resolver.tryResolveTokenOrMixinRef(rsh.get(prop));
    return GridStyleParser.parse(value, {
      startRule,
    });
  };
  ensure(
    rsh.get("display") === "grid",
    "Grid element is expected to have display:grid"
  );
  return {
    gridTemplateColumns: parseProp("grid-template-columns", "axisTemplate"),
  };
}

export function parseGridChildCssProps(rsh: ReadonlyIRuleSetHelpers) {
  // start: X
  // end: span Y
  return {
    row: {
      start: rsh.has("grid-row-start") ? rsh.get("grid-row-start") : undefined,
      span: rsh.has("grid-row-end")
        ? last(rsh.get("grid-row-end").split(" "))
        : undefined,
    },
    column: {
      start: rsh.has("grid-column-start")
        ? rsh.get("grid-column-start")
        : undefined,
      span: rsh.has("grid-column-end")
        ? last(rsh.get("grid-column-end").split(" "))
        : undefined,
    },
  };
}

export function isTrackTemplate(
  template: ReadonlyArray<Track> | FlexibleSize | FixedSize
): template is ReadonlyArray<Track> {
  return isArray(template);
}

export function isFlexibleSize(
  template: ReadonlyArray<Track> | FlexibleSize | FixedSize
): template is FlexibleSize {
  return !isTrackTemplate(template) && template.type === "FlexibleSize";
}

export function isGridTag(tpl: TplNode) {
  if (!isTplTag(tpl)) {
    return false;
  }
  return tpl.vsettings
    .flatMap((vs) => expandRuleSets([vs.rs]))
    .some((rs) => {
      const rsh = readonlyRSH(rs, tpl);
      return rsh.get("display") === "grid";
    });
}
