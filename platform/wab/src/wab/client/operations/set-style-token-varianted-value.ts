import { OperationResult } from "@/wab/client/operations/common";
import { ImmutableToken, toFinalToken } from "@/wab/shared/core/tokens";
import { Site, StyleToken, Variant } from "@/wab/shared/model/classes";

export type SetStyleTokenVariantedValueResult = OperationResult<{}>;

/**
 * Upsert or remove a single varianted-value entry on a style token.
 *
 * Variant-set identity follows the model's matching rule: an entry is
 * identified by the unordered set of its variants. Passing the same set
 * twice updates the existing entry rather than creating a duplicate.
 *
 * For local tokens the value is written to the token itself; for imported
 * (direct dependency) or registered tokens it is written to the token's
 * override in the current site. Transitive-dependency tokens, which cannot
 * be overridden, return an error.
 *
 * @param opts.value - New value for the variant combination, or null to
 *   remove the override entirely.
 */
export function setStyleTokenVariantedValue(opts: {
  site: Site;
  token: StyleToken;
  variants: Variant[];
  value: string | null;
}): SetStyleTokenVariantedValueResult {
  const { site, token, variants, value } = opts;

  if (variants.length === 0) {
    return {
      result: "error",
      message: "At least one variant is required for a varianted value.",
    };
  }

  const finalToken = toFinalToken(token, site);
  if (finalToken instanceof ImmutableToken) {
    return {
      result: "error",
      message: `Token "${token.name}" is from a transitive dependency and cannot be edited or overridden.`,
    };
  }

  if (value === null) {
    finalToken.removeVariantedValue(variants);
  } else {
    finalToken.setVariantedValue(variants, value);
  }

  return { result: "success" };
}
