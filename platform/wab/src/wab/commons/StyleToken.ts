import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { UpsertTokenReq } from "@/wab/shared/ApiSchema";
import { MIXIN_CAP } from "@/wab/shared/Labels";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { toVarName } from "@/wab/shared/codegen/util";
import { isReadonlyArray, isReadonlyMap } from "@/wab/shared/collections";
import {
  arrayEqIgnoreOrder,
  ensure,
  remove,
  removeWhere,
  tuple,
  unexpected,
  withoutNils,
} from "@/wab/shared/common";
import { DependencyWalkScope } from "@/wab/shared/core/project-deps";
import { siteFinalStyleTokensOfType } from "@/wab/shared/core/site-style-tokens";
import { getLengthUnits, parseCss } from "@/wab/shared/css";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Mixin,
  Site,
  StyleToken,
  StyleTokenOverride,
  Variant,
  VariantedValue,
} from "@/wab/shared/model/classes";
import CSSEscape from "css.escape";
import L from "lodash";
import type { Opaque, SetOptional } from "type-fest";

/** A string that can be used as a CSS value. Could be a value or a reference to a token. */
export type TokenValue = Opaque<string, "TokenValue">;

/**
 * Resolved CSS value and token.
 *
 * CSS value may be an empty string if a cycle was detected.
 * The token is the last token in the resolution chain.
 */
export type ResolvedToken = {
  value: TokenValue;
  token: FinalStyleToken;
};

export type FinalStyleToken =
  | MutableStyleToken
  | OverrideableStyleToken
  | ImmutableStyleToken;

abstract class BaseStyleToken {
  constructor(readonly base: StyleToken, readonly isLocal: boolean) {}

  get override(): StyleTokenOverride | null {
    return null;
  }

  get uuid(): string {
    return this.base.uuid;
  }
  get name(): string {
    return this.base.name;
  }
  get type(): TokenType {
    return this.base.type as TokenType;
  }
  get isRegistered(): boolean {
    return this.base.isRegistered;
  }
  // TODO: use TokenValue
  get value(): string {
    return this.base.value;
  }
  // TODO: use TokenValue
  get variantedValues(): readonly VariantedValue[] {
    return this.base.variantedValues;
  }

  protected static setValue(
    tokenOrOverride: StyleToken | StyleTokenOverride,
    value: string
  ): void {
    tokenOrOverride.value = value;
  }

  protected static setVariantedValue(
    tokenOrOverride: StyleToken | StyleTokenOverride,
    variants: Variant[],
    value: string
  ): void {
    const variantedValue = tokenOrOverride.variantedValues.find((v) =>
      arrayEqIgnoreOrder(v.variants, variants)
    );
    if (variantedValue) {
      variantedValue.value = value;
    } else {
      tokenOrOverride.variantedValues.push(
        new VariantedValue({
          variants,
          value,
        })
      );
    }
  }

  protected static removeVariantedValue(
    tokenOrOverride: StyleToken | StyleTokenOverride,
    variants: Variant[]
  ): void {
    removeWhere(tokenOrOverride.variantedValues, (v) =>
      arrayEqIgnoreOrder(v.variants, variants)
    );
  }
}

/** Style tokens in the local project are mutable. */
export class MutableStyleToken extends BaseStyleToken {
  constructor(base: StyleToken) {
    super(base, true);
  }

  setValue(value: string): void {
    BaseStyleToken.setValue(this.base, value);
  }

  setVariantedValue(variants: Variant[], value: string): void {
    BaseStyleToken.setVariantedValue(this.base, variants, value);
  }

  removeVariantedValue(variants: Variant[]): void {
    BaseStyleToken.removeVariantedValue(this.base, variants);
  }
}

/** Style tokens from direct dependencies are immutable but can be overridden. */
export class OverrideableStyleToken extends BaseStyleToken {
  constructor(base: StyleToken, private readonly site: Site) {
    super(base, false);
  }

  get override(): StyleTokenOverride | null {
    return (
      this.site.styleTokenOverrides.find(
        (t) => t.token.uuid === this.base.uuid
      ) ?? null
    );
  }

  get value(): string {
    return this.override?.value ?? this.base.value;
  }
  get variantedValues(): readonly VariantedValue[] {
    const override = this.override;
    if (!override) {
      return this.base.variantedValues;
    }

    return [
      // filter out overridden variants
      ...this.base.variantedValues.filter(
        (v) =>
          !override.variantedValues.find((ov) =>
            arrayEqIgnoreOrder(v.variants, ov.variants)
          )
      ),
      // add overridden variants
      ...override.variantedValues,
    ];
  }

  setValue(value: string): void {
    // Only create an override if the value is different from the base value
    if (this.value !== value) {
      const override = this.upsertStyleTokenOverride();
      BaseStyleToken.setValue(override, value);
    }
  }

  setVariantedValue(variants: Variant[], value: string): void {
    // Only create an override if the value is different from the base value
    if (this.override || this.value !== value) {
      const override = this.upsertStyleTokenOverride();
      BaseStyleToken.setVariantedValue(override, variants, value);
    }
  }

  /** Returns true if override no longer exists. */
  removeValue(): boolean {
    const override = this.override;
    if (!override) {
      return true;
    }

    override.value = null;
    return this.removeOverrideIfEmpty(override);
  }

  /** Returns true if override no longer exists. */
  removeVariantedValue(variants: Variant[]): boolean {
    const override = this.override;
    if (!override) {
      return true;
    }

    BaseStyleToken.removeVariantedValue(override, variants);
    return this.removeOverrideIfEmpty(override);
  }

  private upsertStyleTokenOverride(): StyleTokenOverride {
    const existingOverride = this.site.styleTokenOverrides.find(
      (o) => o.token.uuid === this.base.uuid
    );
    if (existingOverride) {
      return existingOverride;
    }

    const newOverride = new StyleTokenOverride({
      token: this.base,
      value: null,
      variantedValues: [],
    });
    this.site.styleTokenOverrides.push(newOverride);
    return newOverride;
  }

  /** Returns true if removed. */
  private removeOverrideIfEmpty(override: StyleTokenOverride): boolean {
    if (!override.value && override.variantedValues.length === 0) {
      remove(this.site.styleTokenOverrides, override);
      return true;
    } else {
      return false;
    }
  }
}

/** Style tokens from transitive dependencies are immutable and cannot be overridden. */
export class ImmutableStyleToken extends BaseStyleToken {}

export const enum TokenType {
  Color = "Color",
  Spacing = "Spacing",
  Opacity = "Opacity",
  LineHeight = "LineHeight",
  FontFamily = "FontFamily",
  FontSize = "FontSize",
}

export const tokenTypes = [
  TokenType.Color,
  TokenType.FontFamily,
  TokenType.FontSize,
  TokenType.LineHeight,
  TokenType.Opacity,
  TokenType.Spacing,
] as const;

export function toFinalStyleToken(token: StyleToken, site: Site) {
  const isLocal = site.styleTokens.includes(token);

  if (token.isRegistered) {
    return new ImmutableStyleToken(token, isLocal);
  } else if (isLocal) {
    return new MutableStyleToken(token);
  } else if (
    site.projectDependencies
      .flatMap((dep) => dep.site.styleTokens)
      .includes(token)
  ) {
    return new OverrideableStyleToken(token, site);
  } else {
    return new ImmutableStyleToken(token, isLocal);
  }
}

/**
 * Checks if a style token is editable. Can also check if the target global
 * variants are valid.
 */
export function isStyleTokenEditable(
  token: FinalStyleToken,
  vsh: VariantedStylesHelper | undefined
): token is MutableStyleToken | OverrideableStyleToken {
  return (
    (token instanceof MutableStyleToken ||
      (token instanceof OverrideableStyleToken &&
        DEVFLAGS.importedTokenOverrides)) &&
    (vsh === undefined || vsh.canUpdateToken())
  );
}

export function tokenTypeLabel(type: TokenType) {
  switch (type) {
    case TokenType.Color:
      return "Color";
    case TokenType.Spacing:
      return "Spacing";
    case TokenType.LineHeight:
      return "Line Height";
    case TokenType.FontFamily:
      return "Font Family";
    case TokenType.FontSize:
      return "Font Size";
    case TokenType.Opacity:
      return "Opacity";
  }
  throw unexpected();
}

export function tokenTypeDimOpts(type: TokenType) {
  switch (type) {
    case TokenType.Spacing:
      return {
        allowedUnits: getLengthUnits("px"),
      };
    case TokenType.LineHeight:
      return {
        allowedUnits: getLengthUnits(""),
        fractionDigits: 2,
        displayedFractionDigits: 2,
        min: 0,
        delta: 0.1,
      };
    case TokenType.FontSize:
      return {
        allowedUnits: getLengthUnits("px"),
      };
    case TokenType.Opacity:
      return {
        allowedUnits: [""],
        min: 0,
        max: 1,
        delta: 0.1,
        fractionDigits: 4,
        displayedFractionDigits: 2,
      };
    default:
      throw unexpected();
  }
}

export function tokenTypeDefaults(type: TokenType) {
  switch (type) {
    case TokenType.Color:
      return "#ffffff";
    case TokenType.Spacing:
      return "1px";
    case TokenType.LineHeight:
      return "1.5";
    case TokenType.FontSize:
      return "16px";
    case TokenType.Opacity:
      return "1";
    case TokenType.FontFamily:
      return "Roboto";
    default:
      throw unexpected();
  }
}

export const isTokenNameValidCssVariable = (token: StyleToken) =>
  token.name.startsWith("--") && CSSEscape(token.name) === token.name;

export const getPlasmicExternalTokenVarName = (token: StyleToken) =>
  `--plasmic-token-${L.kebabCase(token.name)}`;

export const getTokenVarName = (token: StyleToken) => `--token-${token.uuid}`;

export const mkTokenRef = (token: StyleToken) =>
  `var(${getTokenVarName(token)})`;

export const isTokenRef = (ref: string) => ref.startsWith("var(--token-");

const RE_TOKENREF = /var\(--token-([^)]+)\)/;
const RE_TOKENREF_ALL = new RegExp(RE_TOKENREF, "g");

/**
 * Returns the referenced token (shallow parse).
 * If no token is referenced, returns undefined.
 * @param ref the token ref to parse
 * @param tokensProvider all final tokens (tokens + overrides) in scope
 */
export const tryParseTokenRef = (
  ref: string,
  tokensProvider:
    | ReadonlyArray<FinalStyleToken>
    | (() => ReadonlyArray<FinalStyleToken>)
    | Readonly<Record<string, FinalStyleToken>>
    | ReadonlyMap<string, FinalStyleToken>
): FinalStyleToken | undefined => {
  const m = ref.match(RE_TOKENREF);
  if (!m) {
    return undefined;
  }
  const tokenId = m[1];
  if (isReadonlyArray(tokensProvider) || L.isFunction(tokensProvider)) {
    const tokens = isReadonlyArray(tokensProvider)
      ? tokensProvider
      : tokensProvider();
    return tokens.find((t) => t.uuid === tokenId);
  } else if (isReadonlyMap(tokensProvider)) {
    return tokensProvider.get(tokenId);
  } else {
    return tokensProvider[tokenId];
  }
};

/**
 * Returns the referenced token (shallow parse). Throws if no token is referenced.
 * @param ref the token ref to parse
 * @param tokensProvider all final tokens (tokens + overrides) in scope
 * @returns the parsed token
 */
export const parseTokenRef = (
  ref: string,
  tokensProvider:
    | ReadonlyArray<FinalStyleToken>
    | (() => ReadonlyArray<FinalStyleToken>)
    | Readonly<Record<string, FinalStyleToken>>
    | ReadonlyMap<string, FinalStyleToken>
) => {
  return ensure(
    tryParseTokenRef(ref, tokensProvider),
    `Expected to be a token ref`
  );
};

export const hasTokenRefs = (str: string) => {
  return !!str.match(RE_TOKENREF_ALL);
};

export function hasTokenRef(str: string, token: StyleToken) {
  return str.includes(mkTokenRef(token));
}

export const resolveAllTokenRefs = (
  str: string,
  tokens: ReadonlyArray<FinalStyleToken> | ReadonlyMap<string, FinalStyleToken>,
  valMissingToken?: string,
  vsh?: VariantedStylesHelper
) => {
  const finder = isReadonlyArray(tokens)
    ? (tokenId: string) => tokens.find((t) => t.uuid === tokenId)
    : (tokenId: string) => tokens.get(tokenId);
  return replaceAllTokenRefs(str, (tokenId) => {
    const token = finder(tokenId);
    if (!token) {
      return valMissingToken;
    } else {
      return derefToken(tokens, token, vsh);
    }
  });
};

export const replaceAllTokenRefs = (
  str: string,
  getVal: (tokenId: string) => string | undefined
) => {
  return str.replace(RE_TOKENREF_ALL, (sub, tokenId) => {
    const replace = getVal(tokenId);
    return replace === undefined ? sub : replace;
  });
};

export function tryParseAllTokenRefs(
  str: string,
  tokens: StyleToken[] | Record<string, StyleToken>
) {
  return withoutNils(
    [...str.matchAll(RE_TOKENREF_ALL)].map((m) => {
      if (L.isArray(tokens)) {
        return tokens.find((t) => t.uuid === m[1]);
      } else {
        return tokens[m[1]];
      }
    })
  );
}

export const extractAllReferencedTokens = (
  str: string,
  tokens: StyleToken[]
) => {
  const tokenIds = extractAllReferencedTokenIds(str);
  return withoutNils(tokenIds.map((m) => tokens.find((t) => t.uuid === m)));
};

export function extractAllReferencedTokenIds(str: string) {
  return [...str.matchAll(RE_TOKENREF_ALL)].map((r) => r[1]);
}

export const getThemePropVarName = (p: string) => `--mixin-default_${p}`;
export const mkThemePropRef = (p: string) => `var(${getThemePropVarName(p)})`;

export const getExternalMixinPropVarName = (mixin: Mixin, p: string) =>
  `--plasmic-mixin-${L.kebabCase(mixin.name)}_${p}`;

// Property on Theme's mixin have an indirect reference.
export const getMixinPropVarName = (
  mixin: Mixin,
  p: string,
  tryIndirect: boolean,
  infix?: string
) =>
  `--mixin-${tryIndirect && mixin.forTheme ? "default" : mixin.uuid}${
    infix ? `-${infix}` : ""
  }_${p}`;

export const mkMixinPropRef = (
  mixin: Mixin,
  p: string,
  tryIndirect: boolean,
  infix?: string
) => `var(${getMixinPropVarName(mixin, p, tryIndirect, infix)})`;

export const isMixinPropRef = (ref: string) => ref.startsWith("var(--mixin-");

export const tryParseMixinPropRef = (
  ref: string,
  mixins: Mixin[] | Map<string, Mixin>
) => {
  const m = ref.match(/var\(--mixin-(.+)_(.*)\)$/);
  if (!m) {
    return undefined;
  }
  const mixin = Array.isArray(mixins)
    ? mixins.find((t) => t.uuid === m[1])
    : mixins.get(m[1]);
  return tuple(mixin, m[2]);
};

/**
 * Resolves a token ref to a primitive value.
 * It recursively iterates on the token value till it reaches a primitive value.
 * @param tokens all final tokens (tokens + overrides) in scope
 * @param token the token to resolve
 * @param vsh helps resolve the token value in a varianted context
 * @returns a resolved final style token
 */
export function resolveToken(
  tokens: ReadonlyArray<FinalStyleToken> | ReadonlyMap<string, FinalStyleToken>,
  token: FinalStyleToken,
  vsh?: VariantedStylesHelper
): ResolvedToken {
  const seenTokens = new Set<StyleToken>();
  vsh = vsh ?? new VariantedStylesHelper();

  let curToken = token;
  let curValue = vsh.getActiveTokenValue(token);
  while (isTokenRef(curValue)) {
    curToken = parseTokenRef(curValue, tokens);
    curValue = vsh.getActiveTokenValue(curToken);

    // Return original token if we hit a cycle.
    if (seenTokens.has(curToken.base)) {
      return { token, value: vsh.getActiveTokenValue(token) };
    }
    seenTokens.add(curToken.base);
  }

  return { token: curToken, value: curValue };
}

export function resolveTokenRef(
  tokens: ReadonlyArray<FinalStyleToken> | ReadonlyMap<string, FinalStyleToken>,
  value: TokenValue,
  vsh?: VariantedStylesHelper
): SetOptional<ResolvedToken, "token"> {
  if (isTokenRef(value)) {
    return resolveToken(tokens, parseTokenRef(value, tokens), vsh);
  } else {
    return { value };
  }
}

export function derefTokenRefs(
  tokens: ReadonlyArray<FinalStyleToken> | ReadonlyMap<string, FinalStyleToken>,
  value: string,
  vsh?: VariantedStylesHelper
): TokenValue {
  return resolveTokenRef(tokens, value as TokenValue, vsh).value;
}

export function derefToken(
  tokens: ReadonlyArray<FinalStyleToken> | ReadonlyMap<string, FinalStyleToken>,
  token: FinalStyleToken,
  vsh?: VariantedStylesHelper
): TokenValue {
  return resolveToken(tokens, token, vsh).value;
}

/**
 *  De-refs the token only if the ref is not known by the destination
 * E.g.
 * Token: primary -> gray-900 (the ref coming from a Lib-A) -> #111827
 * Destination:
 * - Case-1: Lib-A is not imported by the destination. In this case, the gray-900 ref is not known. So the token is de-reffed to return #111827
 * - Case-2: Lib-A is imported by the destination. In this case, the gray-900 ref is known, so the token is not re-reffed and gray-900 is returned
 * @param currentTokens Tokens available in the destination
 * @param oldTokens Tokens that were available in the origin
 * @param token the token being transferred from origin to destination
 * @param vsh VariantedStyleHelper
 * @returns the token's primitive/de-reffed value only if the ref is not known by the destination
 */
export function maybeDerefToken(
  currentTokens:
    | ReadonlyArray<FinalStyleToken>
    | ReadonlyMap<string, FinalStyleToken>,
  oldTokens:
    | ReadonlyArray<FinalStyleToken>
    | ReadonlyMap<string, FinalStyleToken>,
  token: FinalStyleToken,
  vsh?: VariantedStylesHelper
): TokenValue {
  // If its a token ref and the ref is present in the current project, then don't de-ref it, because the ref in value is known
  if (tryParseTokenRef(token.value, currentTokens)) {
    return token.value as TokenValue;
  } else {
    // The ref in value is not known, so resolve the token to a primitive value
    return resolveToken(oldTokens, token, vsh).value;
  }
}

export function lazyDerefTokenRefs(
  value: string,
  site: Site,
  tokenType: TokenType,
  opts: { includeDeps?: DependencyWalkScope } = {},
  vsh?: VariantedStylesHelper
): TokenValue {
  if (!isTokenRef(value)) {
    return value as TokenValue;
  }
  const tokens = siteFinalStyleTokensOfType(site, tokenType, opts);
  return derefTokenRefs(tokens, value, vsh);
}

export function lazyDerefTokenRefsWithDeps(
  value: string,
  site: Site,
  tokenType: TokenType,
  vsh?: VariantedStylesHelper
): TokenValue {
  return lazyDerefTokenRefs(
    value,
    site,
    tokenType,
    { includeDeps: "all" },
    vsh
  );
}

export function addOrUpsertTokens(site: Site, tokens: UpsertTokenReq[]) {
  const normalize = toVarName;
  const tokenByNormalizedName = new Map(
    site.styleTokens.map((token) => [normalize(token.name), token])
  );
  const mixinByNormalizedName = new Map(
    site.mixins.map((mixin) => [normalize(mixin.name), mixin])
  );
  const tplMgr = new TplMgr({ site });

  tokens.forEach((token) => {
    if (typeof token.name !== "string") {
      return;
    }
    if (typeof token.value !== "string") {
      throw new Error(
        `Token ${token.name} has unexpected value ${token.value}`
      );
    }
    const normalizedName = normalize(token.name);
    if (token.type === "BoxShadow") {
      try {
        parseCss(token.value, { startRule: "boxShadows" });
      } catch {
        throw new BadRequestError(
          `Couldn't parse BoxShadow value: ${token.value}`
        );
      }

      let mixin = mixinByNormalizedName.get(normalizedName);
      if (!mixin) {
        mixin = tplMgr.addMixin(token.name);
        mixinByNormalizedName.set(normalizedName, mixin);
      }
      const exp = new RuleSetHelpers(mixin.rs, "div");
      exp.merge({
        boxShadow: token.value,
      });
    } else {
      const existingToken = tokenByNormalizedName.get(normalizedName);
      if (existingToken) {
        existingToken.value = token.value;
      } else {
        if (!tokenTypes.includes(token.type)) {
          throw new Error(
            `Token ${token.name} has unexpected type ${token.type}`
          );
        }
        const newToken = tplMgr.addToken({
          name: token.name,
          tokenType: token.type,
          value: token.value, // Maybe we should assert it's a valid value?
        });
        tokenByNormalizedName.set(normalizedName, newToken);
      }
    }
  });

  const varRegex = /var\(([^)]+)\)/;
  const varRegexAll = new RegExp(varRegex, "g");
  const refTokens = tokens.filter((t) => t.value.match(varRegexAll));

  // Fixing the references
  refTokens.forEach((token) => {
    const normalizedName = normalize(token.name);

    if (token.type === "BoxShadow") {
      const mixin = ensure(
        mixinByNormalizedName.get(normalizedName),
        `${MIXIN_CAP} should exist`
      );

      const exp = new RuleSetHelpers(mixin.rs, "div");
      const oldVal = exp.get("boxShadow");
      const newVal = oldVal.replace(varRegexAll, (sub, varName) => {
        const referencedTokenName = normalize(varName);
        const referencedToken = tokenByNormalizedName.get(referencedTokenName);
        if (!referencedToken) {
          throw new Error(`Referenced token ${token.value} should exist`);
        }
        return mkTokenRef(referencedToken);
      });

      exp.merge({
        boxShadow: newVal,
      });
    } else {
      const m = ensure(
        token.value.match(varRegex),
        "Style token should be a reference (i.e be in `var(name)` format"
      );
      const referencedTokenName = normalize(m[1]);
      const referencedToken = tokenByNormalizedName.get(referencedTokenName);
      if (!referencedToken) {
        throw new Error(`Referenced token ${token.value} should exist`);
      }
      const tokenToFix = ensure(
        tokenByNormalizedName.get(normalizedName),
        "Style Token should exist"
      );
      tokenToFix.value = mkTokenRef(referencedToken);
    }
  });
}

export function findTokenByNameOrUuid(searchStr: string, opts: { site: Site }) {
  return opts.site.styleTokens.find(
    (token) =>
      toVarName(token.name) === toVarName(searchStr) || token.uuid === searchStr
  );
}
