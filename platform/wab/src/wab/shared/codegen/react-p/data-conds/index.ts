import { VariantComboChecker } from "@/wab/shared/codegen/react-p/types";
import { joinVariantVals } from "@/wab/shared/codegen/react-p/utils";
import { ensure, tuple } from "@/wab/shared/common";
import { ExprCtx, getRawCode } from "@/wab/shared/core/exprs";
import { VariantSetting } from "@/wab/shared/model/classes";

/**
 * Returns a snippet of code that guards whether a TplNode should be rendered,
 * based on its variants and dataCond.
 */
export function serializeDataConds(
  variantSettings: VariantSetting[],
  variantComboChecker: VariantComboChecker,
  exprCtx: ExprCtx
) {
  const condVariants = variantSettings.filter((v) => !!v.dataCond);

  // If no variants have dataCond, then don't worry about it!
  if (condVariants.length === 0) {
    return "";
  }

  // If all the condVariants say "true", then also don't worry
  // about it
  if (
    condVariants.every(
      (vs) =>
        getRawCode(
          ensure(vs.dataCond, "condVariants all have dataCond"),
          exprCtx
        ) === "true"
    )
  ) {
    return "";
  }

  // Otherwise, we want to use the first variant with a dataCond that is turned
  // on, and that variant solely determines whether this TplNode is rendered.
  // So, the ordering matters here; note that this is a series of
  // `hasVariant(v1) ? v1.dataCond : hasVariant(v2) ? v2.dataCond : true`, rather
  // than a series of ||.
  const condStr = joinVariantVals(
    condVariants.map((vs) =>
      tuple(
        getRawCode(ensure(vs.dataCond, "unexpected nullish dataCond"), exprCtx),
        vs.variants
      )
    ),
    variantComboChecker,
    "true"
  ).value;
  return `${condStr}`;
}
