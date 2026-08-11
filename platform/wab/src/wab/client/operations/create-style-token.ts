import { StyleTokenType } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { GenericError } from "@/wab/shared/error-handling";
import { StyleToken } from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

export type CreateStyleTokenResult = Result<StyleToken, GenericError>;

/**
 * Create a new style token. Token name is uniquified against the site's
 * existing tokens.
 *
 * @param opts.tplMgr - TplMgr instance for the site.
 * @param opts.name - Desired token name.
 * @param opts.type - Token type (Color, Spacing, FontSize, etc.).
 * @param opts.value - Initial value. Either a raw CSS value (e.g. '#fff', '8px')
 *   or a token reference 'var(--token-{uuid})' that points at another token.
 */
export function createStyleToken(opts: {
  tplMgr: TplMgr;
  name: string;
  type: StyleTokenType;
  value: string;
}): CreateStyleTokenResult {
  const { tplMgr, name, type, value } = opts;

  if (!name.trim()) {
    return err({ message: "Token name cannot be empty." });
  }

  return ok(tplMgr.addStyleToken({ name, tokenType: type, value }));
}
