import { Mixin, Site, StyleToken } from "@/wab/classes";
import { ensure, tuple, unexpected, withoutNils } from "@/wab/common";
import { getLengthUnits } from "@/wab/css";
import * as cssPegParser from "@/wab/gen/cssPegParser";
import { DependencyWalkScope } from "@/wab/project-deps";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { UpsertTokenReq } from "@/wab/shared/ApiSchema";
import { toVarName } from "@/wab/shared/codegen/util";
import { MIXIN_CAP } from "@/wab/shared/Labels";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { allTokensOfType } from "@/wab/sites";
import CSSEscape from "css.escape";
import L from "lodash";

export const enum TokenType {
  Color = "Color",
  Spacing = "Spacing",
  Opacity = "Opacity",
  LineHeight = "LineHeight",
  FontFamily = "FontFamily",
  FontSize = "FontSize",
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

export const tryParseTokenRef = (
  ref: string,
  tokensProvider:
    | StyleToken[]
    | (() => StyleToken[])
    | Record<string, StyleToken>
    | Map<string, StyleToken>
) => {
  const m = ref.match(RE_TOKENREF);
  if (!m) return undefined;
  if (L.isArray(tokensProvider) || L.isFunction(tokensProvider)) {
    const tokens = L.isArray(tokensProvider)
      ? tokensProvider
      : tokensProvider();
    return tokens.find((t) => t.uuid === m[1]);
  } else if (tokensProvider instanceof Map) {
    return tokensProvider.get(m[1]);
  } else {
    return tokensProvider[m[1]];
  }
};

export const hasTokenRefs = (str: string) => {
  return !!str.match(RE_TOKENREF_ALL);
};

export function hasTokenRef(str: string, token: StyleToken) {
  return str.includes(mkTokenRef(token));
}

export const resolveAllTokenRefs = (
  str: string,
  tokens: StyleToken[] | Map<string, StyleToken>,
  valMissingToken?: string,
  vsh?: VariantedStylesHelper
) => {
  const finder = Array.isArray(tokens)
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
  tryIndirect: boolean
) => `--mixin-${tryIndirect && mixin.forTheme ? "default" : mixin.uuid}_${p}`;

export const mkMixinPropRef = (mixin: Mixin, p: string, tryIndirect: boolean) =>
  `var(${getMixinPropVarName(mixin, p, tryIndirect)})`;

export const isMixinPropRef = (ref: string) => ref.startsWith("var(--mixin-");

export const tryParseMixinPropRef = (
  ref: string,
  mixins: Mixin[] | Map<string, Mixin>
) => {
  const m = ref.match(/var\(--mixin-(.+)_(.*)\)$/);
  if (!m) return undefined;
  const mixin = Array.isArray(mixins)
    ? mixins.find((t) => t.uuid === m[1])
    : mixins.get(m[1]);
  return tuple(mixin, m[2]);
};

function doDerefTokenRefs(
  tokens: StyleToken[] | Map<string, StyleToken>,
  value: string,
  failSoft?: boolean,
  vsh?: VariantedStylesHelper
) {
  const seenTokens = new Set<StyleToken>();
  vsh = vsh ?? new VariantedStylesHelper();
  while (isTokenRef(value)) {
    const maybeToken = tryParseTokenRef(value, tokens);
    if (!maybeToken && failSoft) {
      return undefined;
    }
    const token = ensure(maybeToken, `Expected to be a token ref`);
    if (seenTokens.has(token)) {
      return "";
    }
    seenTokens.add(token);
    value = vsh.getActiveTokenValue(token);
  }

  return value;
}

export function derefTokenRefs(
  tokens: StyleToken[],
  value: string,
  vsh?: VariantedStylesHelper
) {
  return ensure(
    doDerefTokenRefs(tokens, value, undefined, vsh),
    `Expected token ref`
  );
}

export function derefToken(
  tokens: StyleToken[] | Map<string, StyleToken>,
  token: StyleToken,
  vsh?: VariantedStylesHelper
) {
  vsh = vsh ?? new VariantedStylesHelper();
  return ensure(
    doDerefTokenRefs(tokens, vsh.getActiveTokenValue(token), undefined, vsh),
    "Expected token ref"
  );
}

export function lazyDerefTokenRefs(
  value: string,
  site: Site,
  tokenType: TokenType,
  opts: { includeDeps?: DependencyWalkScope } = {},
  vsh?: VariantedStylesHelper
) {
  if (!isTokenRef(value)) {
    return value;
  }
  const tokens = allTokensOfType(site, tokenType, opts);
  return derefTokenRefs(tokens, value, vsh);
}

export function lazyDerefTokenRefsWithDeps(
  value: string,
  site: Site,
  tokenType: TokenType,
  vsh?: VariantedStylesHelper
) {
  return lazyDerefTokenRefs(
    value,
    site,
    tokenType,
    { includeDeps: "all" },
    vsh
  );
}

export function tryDerefTokenRefs(
  tokens: StyleToken[],
  value: string,
  vsh?: VariantedStylesHelper
) {
  return doDerefTokenRefs(tokens, value, true, vsh);
}

const tokenTypes = [
  TokenType.Color,
  TokenType.FontFamily,
  TokenType.FontSize,
  TokenType.LineHeight,
  TokenType.Opacity,
  TokenType.Spacing,
];

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
        cssPegParser.parse(token.value, { startRule: "boxShadows" });
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
      let mixin = ensure(
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
