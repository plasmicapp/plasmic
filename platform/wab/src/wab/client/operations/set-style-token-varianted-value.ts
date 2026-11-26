import {
  removeStyleTokenOverride,
  setStyleTokenValue,
} from "@/wab/shared/core/site-style-tokens";
import { ImmutableToken, toFinalToken } from "@/wab/shared/core/tokens";
import { GenericError } from "@/wab/shared/error-handling";
import { Site, StyleToken, Variant } from "@/wab/shared/model/classes";
import { Result, err } from "neverthrow";

export type SetStyleTokenVariantedValueResult = Result<void, GenericError>;

/** Pass null to remove the variant override. */
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
    return removeStyleTokenOverride(site, finalToken, [variant]);
  }
  return setStyleTokenValue(site, finalToken, value, [variant]);
}
