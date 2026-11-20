import { ImmutableToken, toFinalToken } from "@/wab/shared/core/tokens";
import { GenericError } from "@/wab/shared/error-handling";
import { Site, StyleToken, Variant } from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

export type SetStyleTokenVariantedValueResult = Result<void, GenericError>;

/**
 * Upsert or remove a single varianted-value entry on a style token.
 *
 * For local tokens the value is written to the token itself; for imported
 * (direct dependency) or registered tokens it is written to the token's
 * override in the current site. Transitive-dependency tokens, which cannot
 * be overridden, return an error.
 *
 * @param opts.value - New value for the variant, or null to remove the
 *   override entirely.
 */
export function setStyleTokenVariantedValue(opts: {
  site: Site;
  token: StyleToken;
  variant: Variant;
  value: string | null;
}): SetStyleTokenVariantedValueResult {
  const { site, token, variant, value } = opts;

  const finalToken = toFinalToken(token, site);
  if (finalToken instanceof ImmutableToken) {
    return err({
      message: `Token "${token.name}" is from a transitive dependency and cannot be edited or overridden.`,
    });
  }

  if (value === null) {
    finalToken.removeVariantedValue([variant]);
  } else {
    finalToken.setVariantedValue([variant], value);
  }

  return ok(undefined);
}
