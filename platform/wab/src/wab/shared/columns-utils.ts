import { ensure } from "@/wab/shared/common";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { RSH, readonlyRSH } from "@/wab/shared/RuleSetHelpers";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  ColumnsConfig,
  ColumnsConfigParams,
  TplTag,
  Variant,
} from "@/wab/shared/model/classes";
import { expandRuleSets } from "@/wab/shared/core/styles";
import { TplColumnsTag } from "@/wab/shared/core/tpls";
import { clamp, isEqual, isUndefined, range, sum } from "lodash";

export const hasMaxWidthVariant = (variant: Variant): boolean => {
  const spec = parseScreenSpec(ensure(variant.mediaQuery));
  return !!spec.maxWidth;
};

export const COLUMNS_CONFIG_DEFAULTS: Record<string, ColumnsConfigParams> = {
  desktop: {
    breakUpRows: false,
    colsSizes: [6, 6],
  },
  mobile: {
    breakUpRows: true,
    colsSizes: [12],
  },
};

export function hasNonResponsiveColumnsStyle(child: TplTag) {
  const RESPONSE_COLUMN_STYLES = [
    "display",
    "flexDirection",
    "position",
    "flexGrow",
    "flexShrink",
    "width",
    "height",
    "alignItems",
  ];
  return child.vsettings
    .flatMap((vs) => expandRuleSets([vs.rs]))
    .some((rs) => {
      const rsh = readonlyRSH(rs, child);
      const styles = rsh.props();
      return styles.some((style) => !RESPONSE_COLUMN_STYLES.includes(style));
    });
}

const COL_NUMBER = 12;

export const isReverseValue = (val: string) => val.endsWith("-reverse");

export function isTplColumnsVariantReversed(
  tpl: TplColumnsTag,
  variants: Variant[],
  vtm: VariantTplMgr
) {
  const tplVs = ensure(vtm.ensureVariantSetting(tpl, variants));
  const rsh = RSH(tplVs.rs, tpl);
  const isReversed =
    isReverseValue(rsh.get("flex-direction")) ||
    isReverseValue(rsh.get("flex-wrap"));

  return isReversed;
}

export function adjustVariantTplColumns(
  tpl: TplColumnsTag,
  variants: Variant[],
  newConfig: ColumnsConfigParams,
  vtm: VariantTplMgr
) {
  const tplVs = vtm.ensureVariantSetting(tpl, variants);

  if (tplVs.columnsConfig) {
    tplVs.columnsConfig.colsSizes = newConfig.colsSizes;
    tplVs.columnsConfig.breakUpRows = newConfig.breakUpRows;
  } else {
    tplVs.columnsConfig = new ColumnsConfig(newConfig);
  }

  /**
   * We have to adjust columns to have reverse in the correct place,
   * if we are applying wrapping we set the reverse in `flex-wrap`
   * else we set it in `flex-direction`. For a 2x2 case, the rows
   * are going to be inverted.
   */
  const isReversed = isTplColumnsVariantReversed(tpl, variants, vtm);
  const tplRSH = RSH(tplVs.rs, tpl);
  if (newConfig.breakUpRows) {
    tplRSH.set("flex-direction", "row");
    tplRSH.set("flex-wrap", `wrap${isReversed ? "-reverse" : ""}`);
  } else {
    tplRSH.set("flex-direction", `row${isReversed ? "-reverse" : ""}`);
    tplRSH.set("flex-wrap", "nowrap");
  }
}

export function updateCurrentTplColumns(
  tpl: TplColumnsTag,
  newConfig: Partial<ColumnsConfigParams>,
  vtm: VariantTplMgr
) {
  const currentConfig = ensure(vtm.effectiveVariantSetting(tpl).columnsConfig);
  const variants = vtm.ensureCurrentVariantSetting(tpl).variants;
  adjustVariantTplColumns(
    tpl,
    variants,
    {
      colsSizes: !isUndefined(newConfig.colsSizes)
        ? newConfig.colsSizes
        : currentConfig.colsSizes,
      breakUpRows: !isUndefined(newConfig.breakUpRows)
        ? newConfig.breakUpRows
        : currentConfig.breakUpRows,
    },
    vtm
  );
}

export function calcMovedColSizes(
  cols: number[],
  idx: number,
  delta: number,
  fullWidth: number
): number[] {
  const colSize = fullWidth / COL_NUMBER;
  const colDiff = clamp(
    Math.round(delta / colSize),
    -cols[idx] + 1,
    cols[idx + 1] - 1
  );
  const newCols = [...cols];
  newCols[idx] += colDiff;
  newCols[idx + 1] -= colDiff;
  return newCols;
}

export function adjustAllTplColumnsSizes(
  tpl: TplColumnsTag,
  vtm: VariantTplMgr
) {
  tpl.vsettings.forEach((vs) => {
    if (vs.columnsConfig) {
      void adjustVariantTplColumns(
        tpl,
        vs.variants,
        {
          ...vs.columnsConfig,
        },
        vtm
      );
    }
  });
}

export function equalColumnDistribution(len: number) {
  return range(len).map(
    (_, idx) => Math.floor(COL_NUMBER / len) + (idx < COL_NUMBER % len ? 1 : 0)
  );
}

// if we have the current columns equaly distributed, we redistribute it equaly
// else, we allocate the smallest size for new columns and try to maintain the proportion
// between already existing cols
export function redistributeColumns(
  cols: number[],
  len: number,
  opts: { forceEqual?: boolean } = {}
) {
  if (isEqual(cols, equalColumnDistribution(cols.length)) || opts.forceEqual) {
    return equalColumnDistribution(len);
  } else {
    const newCols = range(len).map((_, idx) =>
      idx < cols.length ? cols[idx] : 1
    );
    // We adjust the column sizes so that they are proportional and that the sum is smaller then COL_NUMBER
    const colsSum = sum(newCols);
    const proportionalCols = newCols.map((colSize) =>
      Math.max(Math.floor(COL_NUMBER * (colSize / colsSum)), 1)
    );
    // If there are missing cols, probably because it was not possible to redistribute properly to COL_NUMBER
    // just distribute the lenght to the first columns
    const proportionalSum = sum(proportionalCols);
    const missingCols = COL_NUMBER - proportionalSum;
    const redistributedCols = proportionalCols.map(
      (colSize, idx) => colSize + (idx < missingCols ? 1 : 0)
    );
    return redistributedCols;
  }
}

export function redistributeColumnsSizes(
  tpl: TplColumnsTag,
  vtm: VariantTplMgr,
  opts: { forceEqual?: boolean } = {}
) {
  tpl.vsettings.forEach((vs) => {
    if (vs.columnsConfig) {
      // If we are wraping the cols and the number of children is bigger than the wrap
      // we don't need to calculate the redistributed sizes
      const newCols =
        vs.columnsConfig.breakUpRows &&
        vs.columnsConfig.colsSizes.length < tpl.children.length &&
        vs.columnsConfig.colsSizes.length > 0
          ? vs.columnsConfig.colsSizes
          : redistributeColumns(
              vs.columnsConfig.colsSizes,
              tpl.children.length,
              opts
            );

      adjustVariantTplColumns(
        tpl,
        vs.variants,
        {
          ...vs.columnsConfig,
          colsSizes: newCols,
        },
        vtm
      );
    }
  });
}
