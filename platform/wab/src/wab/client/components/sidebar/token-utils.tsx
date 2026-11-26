import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DataTokenType, DataTokenValue } from "@/wab/commons/DataToken";
import { StyleTokenType, StyleTokenValue } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { assert, notNil } from "@/wab/shared/common";
import {
  StyleTokenValueError,
  setStyleTokenValue,
} from "@/wab/shared/core/site-style-tokens";
import {
  FinalToken,
  MutableToken,
  OverrideableToken,
} from "@/wab/shared/core/tokens";
import { DataToken, Site, StyleToken, Token } from "@/wab/shared/model/classes";
import { canCreateAlias } from "@/wab/shared/ui-config-utils";
import { notification } from "antd";
import { Result } from "neverthrow";
import React from "react";
import { FaArrowRight } from "react-icons/fa";

export type TokenType = StyleTokenType | DataTokenType;
export type TokenValue = StyleTokenValue | DataTokenValue;

export type DataTokenPanelRow = TokenPanelRow<
  DataToken,
  DataTokenType,
  DataTokenValue
>;
export type DataTokenFolder = TokenFolder<
  DataToken,
  DataTokenType,
  DataTokenValue
>;
export type DataTokenFolderActions = TokenFolderActions<
  DataToken,
  DataTokenType,
  DataTokenValue
>;

export type StyleTokenPanelRow = TokenPanelRow<
  StyleToken,
  StyleTokenType,
  StyleTokenValue
>;
export type StyleTokenFolder = TokenFolder<
  StyleToken,
  StyleTokenType,
  StyleTokenValue
>;
export type StyleTokenFolderActions = TokenFolderActions<
  StyleToken,
  StyleTokenType,
  StyleTokenValue
>;

interface TokenHeader<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue,
> {
  type: "header";
  tokenType: TType;
  key: string;
  items: TokenPanelRow<TToken, TType, TValue>[];
  count: number;
}

type OnAddToken<TType extends TokenType> = (
  type: TType,
  folderName?: string,
) => Promise<void>;

type OnFolderRenamed<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue,
> = (
  folder: TokenFolder<TToken, TType, TValue>,
  newName: string,
) => Promise<void>;

type OnDeleteFolder<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue,
> = (folder: TokenFolder<TToken, TType, TValue>) => Promise<void>;

interface TokenFolderActions<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue,
> {
  onAddToken: OnAddToken<TType>;
  onDeleteFolder: OnDeleteFolder<TToken, TType, TValue>;
  onFolderRenamed: OnFolderRenamed<TToken, TType, TValue>;
}

export interface TokenFolder<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue,
> {
  type: "folder" | "folder-token";
  tokenType: TType;
  path?: string;
  name: string;
  key: string;
  items: TokenPanelRow<TToken, TType, TValue>[];
  count: number;
  actions?: TokenFolderActions<TToken, TType, TValue>;
}

interface TokenData<TToken extends Token, TValue extends TokenValue> {
  type: "token";
  key: string;
  token: FinalToken<TToken>;
  value: TValue;
  importedFrom?: string;
}

type TokenPanelRow<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue,
> =
  | TokenHeader<TToken, TType, TValue>
  | TokenFolder<TToken, TType, TValue>
  | TokenData<TToken, TValue>;

export const TOKEN_ROW_HEIGHT = 32;

export const getLeftPadding = (indentMultiplier: number) => {
  return indentMultiplier * 16 + 6;
};

export const isTokenPanelReadOnly = (studioCtx: StudioCtx) => {
  const uiConfig = studioCtx.getCurrentUiConfig();
  const canCreateToken = canCreateAlias(uiConfig, "token");

  return (
    !canCreateToken || studioCtx.getLeftTabPermission("tokens") === "readable"
  );
};

/**
 * Type representing the state of a token override indicator.
 * - "set": Base value has been overridden
 * - "overriding": Variant-specific override exists
 * - "inherited": No override, value is inherited
 * - undefined: No indicator should be shown
 */
export type TokenIndicatorType = "set" | "overriding" | "inherited" | undefined;

/**
 * Computes the indicator type for a token
 */
export const getTokenIndicatorType = (
  token: FinalToken<StyleToken>,
  vsh = new VariantedStylesHelper(),
): TokenIndicatorType => {
  if (vsh.isTargetBaseVariant()) {
    if (token instanceof MutableToken) {
      return undefined;
    } else {
      if (notNil(token.override?.value)) {
        return "set";
      } else {
        return "inherited";
      }
    }
  } else {
    // if targeting variant
    const variantedValue = vsh.getVariantedValueWithHighestPriority(token);

    if (token instanceof MutableToken) {
      return variantedValue ? "overriding" : "inherited";
    } else {
      if (
        token.override &&
        variantedValue &&
        token.override.variantedValues.includes(variantedValue)
      ) {
        return "overriding";
      } else {
        return "inherited";
      }
    }
  }
};

/**
 * Sets `token`'s value for the variants `vsh` targets. Must be called within
 * a change; on error nothing is written, and the caller should report it with
 * notifyStyleTokenValueError.
 */
export function updateStyleTokenValue(
  site: Site,
  token: FinalToken<StyleToken>,
  value: string,
  vsh: VariantedStylesHelper,
): Result<void, StyleTokenValueError> {
  assert(
    token instanceof MutableToken || token instanceof OverrideableToken,
    `cannot update token "${token.name}" from transitive dep`,
  );
  return setStyleTokenValue(
    site,
    token,
    value,
    vsh.getTokenUpdateVariants(),
    vsh,
  );
}

export function notifyStyleTokenValueError(error: StyleTokenValueError) {
  if (error.type === "invalid") {
    notification.error({
      message: "Invalid token value",
      description: error.message,
    });
    return;
  }
  const cycle = error.cycle.map((name, i) => (
    <span key={i}>
      <span className={"token-ref-cycle-item"}>{name}</span>
      {i !== error.cycle.length - 1 && <FaArrowRight />}
    </span>
  ));

  notification.error({
    message: "Cyclic token references disallowed",
    description: (
      <div>
        Cannot refer to the token since it will lead to the following cycle{" "}
        <div>{cycle}</div>
      </div>
    ),
  });
}

export const isDataTokenPanelReadOnly = (studioCtx: StudioCtx) => {
  const uiConfig = studioCtx.getCurrentUiConfig();
  const canCreateToken = canCreateAlias(uiConfig, "dataToken");

  return (
    !canCreateToken ||
    studioCtx.getLeftTabPermission("dataTokens") === "readable"
  );
};
