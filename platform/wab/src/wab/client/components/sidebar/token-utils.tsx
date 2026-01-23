import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DataTokenType, DataTokenValue } from "@/wab/commons/DataToken";
import {
  StyleTokenType,
  StyleTokenValue,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { assert, notNil } from "@/wab/shared/common";
import { siteFinalStyleTokensOfType } from "@/wab/shared/core/site-style-tokens";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { DataToken, Site, StyleToken, Token } from "@/wab/shared/model/classes";
import { canCreateAlias } from "@/wab/shared/ui-config-utils";
import { notification } from "antd";
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
  TValue extends TokenValue
> {
  type: "header";
  tokenType: TType;
  key: string;
  items: TokenPanelRow<TToken, TType, TValue>[];
  count: number;
}

type OnAddToken<TType extends TokenType> = (
  type: TType,
  folderName?: string
) => Promise<void>;

type OnFolderRenamed<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue
> = (
  folder: TokenFolder<TToken, TType, TValue>,
  newName: string
) => Promise<void>;

type OnDeleteFolder<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue
> = (folder: TokenFolder<TToken, TType, TValue>) => Promise<void>;

interface TokenFolderActions<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue
> {
  onAddToken: OnAddToken<TType>;
  onDeleteFolder: OnDeleteFolder<TToken, TType, TValue>;
  onFolderRenamed: OnFolderRenamed<TToken, TType, TValue>;
}

export interface TokenFolder<
  TToken extends Token,
  TType extends TokenType,
  TValue extends TokenValue
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
  TValue extends TokenValue
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
  vsh = new VariantedStylesHelper()
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

export const newTokenValueAllowed = (
  token: FinalToken<StyleToken>,
  site: Site,
  newValue: string,
  vsh?: VariantedStylesHelper
) => {
  const allTokensOfSameType = siteFinalStyleTokensOfType(site, token.type, {
    includeDeps: "direct",
  });

  const maybeCycle = maybeTokenRefCycle(
    token,
    allTokensOfSameType,
    newValue,
    vsh
  );
  if (!maybeCycle) {
    return true;
  }
  const cycle = maybeCycle.map((name, i) => (
    <span key={i}>
      <span className={"token-ref-cycle-item"}>{name}</span>
      {i !== maybeCycle.length - 1 && <FaArrowRight />}
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

  return false;
};

function maybeTokenRefCycle(
  token: FinalToken<StyleToken>,
  tokens: ReadonlyArray<FinalToken<StyleToken>>,
  newValue: string,
  vsh?: VariantedStylesHelper
): string[] | undefined {
  const visited = new Set<StyleToken>([token.base]);
  let curValue = newValue;
  vsh = vsh ?? new VariantedStylesHelper();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const referredToken = tryParseTokenRef(curValue, tokens);
    if (!referredToken) {
      return undefined;
    }
    if (visited.has(referredToken.base)) {
      // It must be the case the the cycle end up referring token itself;
      // otherwise, we would have detected the cycle beforehand.
      assert(
        referredToken.base === token.base,
        () =>
          `token ${token.name} (${token.uuid}) is cyclically referencing ${referredToken.name} (${referredToken.uuid})`
      );
      const cycle = [...visited].map((t) => t.name);
      cycle.push(referredToken.name);
      return cycle;
    }
    visited.add(referredToken.base);
    curValue = vsh.getActiveTokenValue(referredToken);
  }
}

export const isDataTokenPanelReadOnly = (studioCtx: StudioCtx) => {
  const uiConfig = studioCtx.getCurrentUiConfig();
  const canCreateToken = canCreateAlias(uiConfig, "dataToken");

  return (
    !canCreateToken ||
    studioCtx.getLeftTabPermission("dataTokens") === "readable"
  );
};
