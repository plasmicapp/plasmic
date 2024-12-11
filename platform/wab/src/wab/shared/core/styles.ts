import {
  TokenType,
  extractAllReferencedTokenIds,
  getExternalMixinPropVarName,
  getMixinPropVarName,
  getPlasmicExternalTokenVarName,
  getThemePropVarName,
  getTokenVarName,
  isMixinPropRef,
  isTokenNameValidCssVariable,
  isTokenRef,
  mkMixinPropRef,
  mkThemePropRef,
  mkTokenRef,
  replaceAllTokenRefs,
  resolveAllTokenRefs,
  tokenTypeDefaults,
  tryParseMixinPropRef,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { DeepReadonly, DeepReadonlyArray } from "@/wab/commons/types";
import * as cssPegParser from "@/wab/gen/cssPegParser";
import { getArenaFrames } from "@/wab/shared/Arenas";
import {
  RSH,
  RuleSetHelpers,
  readonlyRSH,
  splitCssValue,
} from "@/wab/shared/RuleSetHelpers";
import { isStyledTplSlot } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  VariantCombo,
  getGlobalVariants,
  hasScreenVariant,
  isBaseRuleVariant,
  isBaseVariant,
  isCodeComponentVariant,
  isScreenVariant,
  isStyleOrCodeComponentVariant,
  isStyleVariant,
  tryGetBaseVariantSetting,
  tryGetPrivateStyleVariant,
  tryGetVariantSetting,
  variantComboKey,
} from "@/wab/shared/Variants";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import {
  makeTokenRefResolver,
  siteToAllTokensDict,
} from "@/wab/shared/cached-selectors";
import { getTplCodeComponentVariantMeta } from "@/wab/shared/code-components/variants";
import { ComponentGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import { makeCssClassNameForVariantCombo } from "@/wab/shared/codegen/react-p/class-names";
import {
  makeRootResetClassName,
  makeWabFlexContainerClassName,
  makeWabHtmlTextClassName,
  makeWabInstanceClassName,
  makeWabSlotClassName,
  makeWabSlotStringWrapperClassName,
  makeWabTextClassName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { TargetEnv } from "@/wab/shared/codegen/types";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  assert,
  capCamelCase,
  ensure,
  ensureInstance,
  maybe,
  mkShortId,
  notNil,
  tuple,
  unreachable,
  withoutNils,
  xMapValues,
  xpickBy,
  xpickExists,
} from "@/wab/shared/common";
import { BackgroundLayer, bgClipTextTag } from "@/wab/shared/core/bg-styles";
import {
  isCodeComponent,
  isFrameComponent,
} from "@/wab/shared/core/components";
import {
  FallbackableExpr,
  codeLit,
  isFallbackableExpr,
} from "@/wab/shared/core/exprs";
import {
  getImageAssetVarName,
  resolveAllAssetRefs,
} from "@/wab/shared/core/image-assets";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  GeneralUsageSummary,
  isHostLessPackage,
} from "@/wab/shared/core/sites";
import {
  ALWAYS_RESOLVE_MIXIN_PROPS,
  CONTENT_LAYOUT_DEFAULTS,
  CONTENT_LAYOUT_STANDARD_WIDTH_PROP,
  CONTENT_LAYOUT_VIEWPORT_GAP_PROP,
  CONTENT_LAYOUT_WIDE_WIDTH_PROP,
  FAKE_FLEX_CONTAINER_PROPS,
  GAP_PROPS,
  TPL_COMPONENT_PROPS,
  componentRootResetProps,
  getAllDefinedStyles,
  imageCssProps,
  inheritableCssProps,
  nonInheritableTypographCssProps,
  slotCssProps,
  transitionProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import {
  canTagHaveChildren,
  findVariantSettingsUnderTpl,
  isComponentRoot,
  isTplCodeComponent,
  isTplColumns,
  isTplComponent,
  isTplIcon,
  isTplPicture,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
  tryGetOwnerSite,
} from "@/wab/shared/core/tpls";
import { has3dComponent } from "@/wab/shared/core/transform-utils";
import * as css from "@/wab/shared/css";
import {
  getCssOverrides,
  getTagsWithCssOverrides,
  normProp,
  showCssShorthand,
} from "@/wab/shared/css";
import { imageDataUriToBlob } from "@/wab/shared/data-urls";
import { ThemeTagSource } from "@/wab/shared/defined-indicator";
import { getProjectFlags } from "@/wab/shared/devflags";
import { standardCorners, standardSides } from "@/wab/shared/geom";
import { getGoogFontMeta } from "@/wab/shared/googfonts";
import {
  getNumericGap,
  isContentLayoutTpl,
  makeLayoutAwareRuleSet,
} from "@/wab/shared/layoututils";
import {
  ArenaFrame,
  Arg,
  Component,
  ImageAsset,
  Mixin,
  RuleSet,
  SelectorRuleSet,
  Site,
  StyleExpr,
  StyleToken,
  Theme,
  ThemeLayoutSettings,
  ThemeStyle,
  TplComponent,
  TplNode,
  TplTag,
  Variant,
  VariantSetting,
  VariantedRuleSet,
  VariantedValue,
  ensureKnownStyleScopeClassNamePropType,
  ensureKnownTplComponent,
  isKnownClassNamePropType,
  isKnownStyleExpr,
  isKnownStyleScopeClassNamePropType,
  isKnownStyleToken,
  isKnownStyleTokenRef,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import {
  deriveSizeStyleValue,
  deriveSizeStylesForTpl,
  getViewportAwareHeight,
  isExplicitSize,
  isSizeProp,
} from "@/wab/shared/sizingutils";
import {
  makeGlobalVariantComboSorter,
  partitionVariants,
} from "@/wab/shared/variant-sort";
import { appendVisibilityStylesForTpl } from "@/wab/shared/visibility-utils";
import L, { camelCase, pick } from "lodash";
import { CSSProperties } from "react";
import { unquote } from "underscore.string";

export const selstr = (rs: /*TWZ*/ RuleSet) => `.${classNameForRuleSet(rs)}`;

export class CssVarResolver {
  private tokens: Map<string, StyleToken>;
  private assets: Map<string, ImageAsset>;
  private mixins: Map<string, Mixin>;
  constructor(
    tokens: StyleToken[],
    mixins: Mixin[],
    assets: ImageAsset[],
    private readonly activeTheme: Theme | undefined | null,
    private readonly opts: {
      keepAssetRefs?: boolean;
      useCssVariables?: boolean;
      cssVariableInfix?: string;
    } = {},
    private readonly vsh: VariantedStylesHelper = new VariantedStylesHelper()
  ) {
    this.tokens = new Map(tokens.map((t) => [t.uuid, t]));
    this.assets = new Map(assets.map((t) => [t.uuid, t]));
    this.mixins = new Map(mixins.map((t) => [t.uuid, t]));
  }

  resolveThemeProp(prop: string) {
    if (shouldOutputThemePropStyle(this.activeTheme, prop)) {
      return this.resolveMixinProp(this.activeTheme!.defaultStyle, prop);
    } else {
      return undefined;
    }
  }

  tryResolveTokenOrMixinRef(refOrValue: string) {
    if (isMixinPropRef(refOrValue)) {
      refOrValue = this.resolveMixinRef(refOrValue);
    }
    return this.tryResolveTokenRefs(refOrValue);
  }

  tryResolveTokenRefs(str: string) {
    return this.resolveTokenRefs(str);
  }

  resolveTokenRefs(str: string) {
    const resolved = !this.opts.keepAssetRefs
      ? resolveAllAssetRefs(str, this.assets)
      : str;
    if (this.opts.useCssVariables) {
      return resolved;
    }
    return resolveAllTokenRefs(resolved, this.tokens, undefined, this.vsh);
  }

  resolveMixinRef(ref: string) {
    const [mixin, prop] = ensure(
      tryParseMixinPropRef(ref, this.mixins),
      () => "Couldn't resolve mixin ref " + ref
    );
    return this.resolveMixinProp(
      ensure(mixin, () => "No mixin"),
      prop
    );
  }

  resolveMixinProp(mixin: Mixin, prop: string) {
    if (this.opts.useCssVariables && mixin.forTheme) {
      return mkMixinPropRef(mixin, prop, false, this.opts.cssVariableInfix);
    }

    const rsh = new RuleSetHelpers(mixin.rs, "div");

    const val = rsh.get(prop);
    const resolved = this.tryResolveTokenRefs(val);
    return resolved;
  }
}

export class CanvasVarResolver {
  constructor(private site: Site) {}
  resolveThemeProp(prop: string) {
    return mkCanvasThemePropRef(this.site, prop);
  }

  resolveMixinProp(mixin: Mixin, prop: string) {
    return mkMixinPropRef(mixin, prop, false);
  }
}

// The name of the default style rules used in studio.
export const studioDefaultStylesClassNameBase = "__wab_defaults";

export const defaultStyleClassNames = (classNameBase: string, tag?: string) => {
  if (tag === "PlasmicImg") {
    return [];
  }
  if (tag) {
    return [
      `${classNameBase}__all`,
      defaultTagStyleClassName(classNameBase, tag),
    ];
  } else {
    return [`${classNameBase}__all`];
  }
};

export const defaultTagStyleClassName = (
  classNameBase: string,
  tag: string
) => {
  return `${classNameBase}__${tag}`;
};

export function makeDefaultStylesRules(
  classNameBase: string,
  opts: { targetEnv: TargetEnv }
) {
  const rules = getTagsWithCssOverrides().map((tag) => {
    const textSelector = `:where(.${makeWabHtmlTextClassName(opts)} ${tag})`;
    if (tag === "*") {
      return `
        :where(.${classNameBase}all) { ${makeDefaultStylesRuleBodyFor(tag)} }
        ${textSelector} { ${makeDefaultStylesRuleBodyFor(tag, true)} }
      `;
    }
    // Note that we don't use ${tag}.${classNameBase}, which has higher
    // precedence than other rules, defeating the purpose of use them as the
    // base. The cost is that the generated code need to hard code these two
    // classes.
    return `
      :where(.${classNameBase}${tag}) { ${makeDefaultStylesRuleBodyFor(tag)} }
      ${textSelector} { ${makeDefaultStylesRuleBodyFor(tag, true)} }
    `;
  });
  return rules;
}

export function makeDefaultStylesRuleBodyFor(
  tag: string,
  forExprText?: boolean
) {
  const defaults = getCssOverrides(tag, !!forExprText);
  // For inheritable css props, we are setting the defaults at
  // component boundaries, so we want each individual element to
  // explicitly "inherit", instead of being set to a specific
  // initial value in our css initials map. For example, we reset
  // white-space to pre-wrap, but if you have a slot that sets
  // white-space to nowrap, then you'll want the slot content
  // to inherit that white-space value, instead of explicitly
  // setting white-space to pre-wrap again. An exception is made for
  // button, for which we want to keep the default `text-align:
  // center`.
  for (const prop of inheritableCssProps) {
    if (prop in defaults) {
      if (tag === "button" && prop === "text-align") {
        continue;
      }
      defaults[prop] = "inherit";
    }
  }

  const m = new Map<string, string>(
    L.entries(defaults).map(([key, value]) => [key, value as string])
  );

  addFontFamilyFallback(m);

  return [...preferShorthand(m).entries()]
    .map(([prop, value]) => {
      return `  ${prop}: ${value};`;
    })
    .join("\n");
}

// Tags that support setting default styles.
export const THEMABLE_TAGS = [
  "a",
  "blockquote",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
];

function isStylePropApplicable(tpl: TplNode, prop: string) {
  if (isTplTag(tpl)) {
    if (THEMABLE_TAGS.includes(tpl.tag)) {
      // All themable tags can have any style, as all styles are
      // available anyway in the theme controls
      return true;
    } else if (isTplTextBlock(tpl) || ["input", "textarea"].includes(tpl.tag)) {
      // text blocks or input/textarea can take any style, including typography
      return true;
    } else if (isTplIcon(tpl)) {
      return prop === "color" || !typographyCssProps.includes(prop);
    } else {
      // all other tags -- containers, images -- can only take
      // non-typography props
      return !typographyCssProps.includes(prop);
    }
  } else if (isTplSlot(tpl)) {
    // a styled slot can only take specific props
    return slotCssProps.includes(prop);
  } else if (isTplComponent(tpl)) {
    if (isCodeComponent(tpl.component)) {
      return true;
    }
    // TplComponents can only have positioning props
    return TPL_COMPONENT_PROPS.includes(prop);
  } else {
    return false;
  }
}

function addFontFamilyFallback(m: Map<string, string>) {
  if (m.has("font-family")) {
    const fontFamily = ensure(
      m.get("font-family"),
      () => "Expected font-family value, but got " + m.get("font-family")
    );
    m.set("font-family", extendFontFamilyWithFallbacks([fontFamily]));
  }
}

export function mkComponentRootResetRule(
  site: Site,
  rootClassName: string,
  resolver?: CssVarResolver
) {
  const m = new Map<string, string>();
  componentRootResetProps.forEach((prop) => {
    const val = resolver
      ? resolver.resolveThemeProp(prop)
      : mkCanvasThemePropRef(site, prop);
    if (val) {
      // We only add styles that the user did not remove from the
      // default theme
      m.set(prop, val);
    }
  });

  addFontFamilyFallback(m);

  return `:where(.${rootClassName}) {
    ${showStyles(m) ?? ""}
  }`;
}

export function mkThemeStyleRule(
  rootRuleName: string,
  resolver: { resolveMixinProp: (mixin: Mixin, prop: string) => string },
  themeStyle: ThemeStyle,
  opts: {
    targetEnv: TargetEnv;
    classNameBase: string;
    useCssModules?: boolean;
  }
) {
  const { selector, style: mixin } = themeStyle;
  const { classNameBase, useCssModules } = opts;
  const m = new Map<string, string>();
  for (const [name, value] of Object.entries(
    makeLayoutAwareRuleSet(mixin.rs, false).values
  )) {
    m.set(name, resolver.resolveMixinProp(mixin, name));
    if (name === "background") {
      deriveBackgroundStyles(m, value);
    }
  }
  const [tag, ...rest] = selector.split(":");
  const pseudo = rest.join(":");

  const defaultTagClassName =
    // css modules uses `.a` as the default tag name
    useCssModules ? tag : defaultTagStyleClassName(classNameBase, tag);
  const pseudoSelector = pseudo ? `:${pseudo}` : "";

  addFontFamilyFallback(m);

  // We are threading the needle here in the specificity we want for our theme tag
  // styles.  The rules are:
  //
  // * We want to win over any global tag styles, like a global `a` style rule.
  // * We don't want to interfere with tags rendered by code components.
  //   so for example, if a code component renders a bunch of `<a/>`, we do not,
  //   by default, want to style those tags with our default tag styles. Code
  //   components should just look exactly how they were designed to look.
  // * We want to lose against tailwind classes (so must have lower specificity
  //   than a class selector, like `.bold`).
  //
  // We do this by using specificity of bare tag selector, and putting
  // everything else into `:where()`. For example,
  //
  //   :where(.root-reset) a:where(.plasmic-a)
  //
  // This ensure that we will win over global bare `a` styles (as Plasmic styles
  // are usually loaded after global styles and so have higher precedence),
  // and we only target Plasmic-generated tags (`.plasmic-a`) so we avoid styling
  // tags rendered by code components.
  const selectors = withoutNils([
    // all tags under .root-reset
    `:where(.${rootRuleName}) ${tag}:where(.${defaultTagClassName})${pseudoSelector}`,

    // when the root element itself is of that tag
    `${tag}:where(.${rootRuleName}.${defaultTagClassName})${pseudoSelector}`,

    // tags under data binding expressions rendered as html, we target them
    // directly, since they won't have `.plasmic-a` tags attached, but we still
    // think of them as under the domain of Plasmic content
    `:where(.${rootRuleName} .${makeWabHtmlTextClassName(
      opts
    )}) ${tag}${pseudoSelector}`,

    // finally, also a variant that targets the tag directly, even those
    // in code components
    `:where(.${rootRuleName}_tags) ${tag}${pseudoSelector}`,
    `${tag}:where(.${rootRuleName}_tags)${pseudoSelector}`,
  ]);
  return `
    ${selectors.join(", ")} {
      ${showStyles(m) ?? ""}
    }
  `;
}

export function tplMatchThemeStyle(
  s: ThemeStyle,
  tpl: TplTag,
  vsettings: VariantSetting[]
): boolean {
  const [styleTag, stylePseudoClass] = s.selector.split(":");
  if (tpl.tag !== styleTag) {
    return false;
  }
  if (!stylePseudoClass) {
    return true;
  }
  const elementPseudoClasses = vsettings.flatMap((vs) =>
    vs.variants.flatMap((v) => v.selectors || [])
  );
  return elementPseudoClasses.includes(`:${stylePseudoClass}`);
}

export function sourceMatchThemeStyle(s: ThemeStyle, src: ThemeTagSource) {
  return src.selector === s.selector;
}

function mkCanvasThemePropRef(site: Site, prop: string) {
  if (shouldOutputThemePropStyle(site.activeTheme, prop)) {
    return mkThemePropRef(prop);
  } else {
    return undefined;
  }
}

function shouldOutputThemePropStyle(
  theme: Theme | undefined | null,
  prop: string
) {
  if (!theme) {
    return false;
  } else if (
    !["white-space"].includes(prop) &&
    !(prop in theme.defaultStyle.rs.values)
  ) {
    // If this prop is not specified in defaultStyle, then return undefined,
    // instead of css initial; makes sure that if the user does _not_ want to use
    // a default style, we don't force it on them.
    // We make an exception for white-space, as our rich text output depends
    // on `white-space: pre-wrap`.
    return false;
  } else {
    return true;
  }
}

function deriveCssRuleSetStyles(
  ctx: ComponentGenHelper,
  tpl: TplNode,
  vs: VariantSetting,
  opts: {
    whitespaceNormal?: boolean;
  }
) {
  const site = ctx.site;
  const resolver = ctx.resolver;
  const rs = vs.rs;
  const forBaseVariant = isBaseVariant(vs.variants);
  const effectiveExpr = ctx.getEffectiveExpr(tpl, vs.variants);

  const m = new Map<string, string>();

  // We always set the theme props on the root tags of components.
  // We only do this for TplTag and not TplComponent, because a
  // TplComponent's styles are dictated by TplComponent.component.
  if (isComponentRoot(tpl) && forBaseVariant && !isTplComponent(tpl)) {
    nonTypographyThemeableProps.forEach((prop) => {
      if (isStylePropApplicable(tpl, prop)) {
        const val = resolver
          ? resolver.resolveThemeProp(prop)
          : mkCanvasThemePropRef(site, prop);
        if (val) {
          m.set(prop, val);
        }
      }
    });
  }
  // Mixins are applied indirectly.
  [...rs.mixins].forEach((mixin) =>
    Object.entries(ctx.makeLayoutAwareRuleSet(mixin.rs, false).values).forEach(
      ([name, val]) => {
        if (isStylePropApplicable(tpl, name)) {
          if (ALWAYS_RESOLVE_MIXIN_PROPS.includes(name)) {
            m.set(
              name,
              resolver ? resolver.resolveMixinProp(mixin, name) : val
            );
          } else {
            m.set(
              name,
              resolver
                ? resolver.resolveMixinProp(mixin, name)
                : mkMixinPropRef(mixin, name, /*tryIndirect=*/ false)
            );
          }
        }
      }
    )
  );
  Object.entries(makeLayoutAwareRuleSet(rs, forBaseVariant).values).forEach(
    ([name, val]) => {
      if (!isStylePropApplicable(tpl, name)) {
        return;
      }
      if (
        name === "display" &&
        effectiveExpr.getRaw(css.PLASMIC_DISPLAY_NONE) === "true"
      ) {
        // Do not set `display` if the effectiveVs says this node has
        // `display: none`. This is needed because `display` coming from
        // settings such as responsive columns should not override visibility
        // setting from the effective variant setting.
        return;
      }
      m.set(name, resolver ? resolver.tryResolveTokenRefs(val) : val);
    }
  );

  // If the element has a 3d transform, it should have transform-style: preserve-3d
  const childPerspective = effectiveExpr.getRaw("perspective") || "0px";
  if (
    childPerspective !== "0px" ||
    (effectiveExpr.has("transform") &&
      splitCssValue("transform", effectiveExpr.get("transform")).some((val) =>
        has3dComponent(val)
      ))
  ) {
    m.set("transform-style", "preserve-3d");
  }

  // If the parent is a flex container with gap, then we put !important on
  // its margin left/top styles, to make sure it overrides the default gap
  // (which is implemented as a margin on this child using
  // `__wab_flex-container > *`)
  // We merge the child margin with the parent's flex gap, to simulate what
  // real flex gap does.
  const parent = ctx.layoutParent(tpl, true);
  if (parent && isTplVariantable(parent)) {
    const parentExp = ctx.getEffectiveExprWithTheme(parent, vs.variants);
    if (hasGapStyle(parent)) {
      // Use `effectiveExp` to get the effective margin styles
      const effectiveExp = ctx.getEffectiveExprWithTheme(tpl, vs.variants);
      const getParentGap = (prop: "flex-column-gap" | "flex-row-gap") => {
        const numericGap = getNumericGap(parentExp, prop);
        const resolvedGap =
          numericGap && resolver
            ? resolver.tryResolveTokenRefs(numericGap)
            : numericGap;
        // If we're rendering in the studio, we always render a flex container
        // as if it has a flex gap of 0, even if it doesn't, so that we can
        // support drag-to-resize-gap.  Which means we always need to override
        // that parent gap in the studio if we have a margin!
        // TODO: Drag-to-resize not currently in use, so we just return undefined to avoid
        // positioning bugs
        const parentGap = resolvedGap ?? undefined;
        return parentGap;
      };

      const parentColGap = getParentGap("flex-column-gap");
      const parentRowGap = getParentGap("flex-row-gap");

      // TODO: marginLeft may be a mixin prop ref.  Resolve it to a real number here.
      const marginLeft = maybe(effectiveExp.getRaw("margin-left"), (val) =>
        resolver ? resolver.tryResolveTokenOrMixinRef(val) : val
      );
      if (marginLeft && parentColGap) {
        if (isExplicitSize(marginLeft)) {
          m.set(
            "margin-left",
            `calc(${marginLeft} + ${parentColGap}) !important`
          );
        } else {
          m.set("margin-left", `${marginLeft} !important`);
        }
      }

      const marginTop = maybe(effectiveExp.getRaw("margin-top"), (val) =>
        resolver ? resolver.tryResolveTokenOrMixinRef(val) : val
      );
      if (marginTop && parentRowGap) {
        if (isExplicitSize(marginTop)) {
          m.set(
            "margin-top",
            `calc(${marginTop} + ${parentRowGap}) !important`
          );
        } else {
          m.set("margin-top", `${marginTop} !important`);
        }
      }
    }
  }

  appendSizeStyles(ctx, m, tpl, vs);
  appendContentLayoutStyles(ctx, m, tpl, vs);
  appendVisibilityStylesForTpl(ctx, tpl, vs, m);

  // Disable the outline when the element has a focused VariantSetting
  if (
    vs.variants.some(
      (v) => isStyleVariant(v) && v.selectors?.some((s) => s.includes(":focus"))
    ) &&
    !hasOutlineStyle(m)
  ) {
    m.set("outline", "none");
  }

  postProcessStyles(m, {
    isStudio: ctx.isStudio,
    whitespaceNormal: opts.whitespaceNormal,
  });

  return m;
}

function normalizeWhitespace(val: string) {
  if (val === "pre-wrap") {
    return "normal";
  } else if (val === "pre") {
    return "nowrap";
  }
  return val;
}

function preNormalizeWhitespace(val: string) {
  if (val === "normal") {
    return "pre-wrap";
  } else if (val === "nowrap") {
    return "pre";
  }
  return val;
}

function postProcessStyles(
  m: Map<string, string>,
  opts: {
    isStudio?: boolean;
    whitespaceNormal?: boolean;
  }
) {
  if (m.has("background")) {
    deriveBackgroundStyles(
      m,
      ensure(
        m.get("background"),
        () => "Expected background value but got " + m.get("background")
      )
    );
  }

  if (m.has("white-space")) {
    const val = ensure(m.get("white-space"), "white-space was just checked");
    if (opts.whitespaceNormal) {
      m.set("white-space", normalizeWhitespace(val));
    } else {
      // white-space should either be "pre-wrap" -- preserves consecutive
      // white spaces, and line wraps -- or "pre" -- no automatic line wraps.
      // We currently use values "normal" and "nowrap", but these don't
      // preserve consecutive white spaces, and so don't work well with slate.js
      // and don't reflect what the user actually typed.
      // TODO: migrate all existing white-space values to be either
      // "pre-wrap" or "pre", instead of doing so at code generation time,
      // once we are sure these are the right settings.
      m.set("white-space", preNormalizeWhitespace(val));
    }
  }

  // Usually RuleSet.values store valid css values. But for some props,
  // we store special encoding within the css values. So here we make
  // sure we transform them into the proper css values, using showCssValues.
  // - "transform" is delimited with fake delimiter "###"
  // - filter and backdrop-filter may have "#hidden" tags
  for (const prop of ["transform", "filter", "backdrop-filter"]) {
    if (m.has(prop)) {
      const val = m.get(prop)!;
      m.set(prop, css.showCssValues(prop, splitCssValue(prop, val)));
    }
  }

  addFontFamilyFallback(m);

  if (m.has("backdrop-filter")) {
    const value = ensure(
      m.get("backdrop-filter"),
      () =>
        "Expected backdrop-filter value, but got " + m.get("backdrop-filter")
    );
    m.set("-webkit-backdrop-filter", value);
  }

  transitionProps.forEach((prop) => {
    const value = m.get(prop);
    if (value != null) {
      m.set(`-webkit-${prop}`, value);
    }
  });

  if (opts.isStudio) {
    ["height", "min-height"].forEach((prop) => {
      if (m.has(prop)) {
        m.set(prop, getViewportAwareHeight(m.get(prop)!));
      }
    });
  }
}

function appendContentLayoutStyles(
  ctx: ComponentGenHelper,
  m: Map<string, string>,
  tpl: TplNode,
  vs: VariantSetting
) {
  if (isBaseVariant(vs.variants)) {
    if (isContentLayoutTpl(tpl)) {
      m.set("display", "grid");
      m.set(
        "grid-template-columns",
        "var(--plsmc-viewport-gap) 1fr minmax(0, var(--plsmc-wide-chunk)) min(var(--plsmc-standard-width), calc(100% - var(--plsmc-viewport-gap) - var(--plsmc-viewport-gap))) minmax(0, var(--plsmc-wide-chunk)) 1fr var(--plsmc-viewport-gap) "
      );
    }

    // Nested content layout tpl must be full bleed. To do this check,
    // we look _deeply_ to see if this tpl is content layout -- that is,
    // even if this is a TplComponent, we look through the component root
    // to check if it is a content layout.  Then, we look at its
    // layout parently _deeply_ as well -- taht is, even if its parent
    // is a TplComponent, we find the corresponding TplSlot, and look at
    // _its_ layout parent, to check if it is content layout.
    // TODO: currently disabling this, as we may want nested content layout
    // to be resizable.  We'll see!
    // if (isContentLayoutTpl(tpl, { deep: true })) {
    //   const layoutParent = ctx.deepLayoutParent(tpl);
    //   const hasContentLayoutParent =
    //     layoutParent && isContentLayoutTpl(layoutParent);
    //   if (hasContentLayoutParent) {
    //     m.set("grid-column", "1 / -1");
    //     m.set("width", "100%");
    //   }
    // }
  }
}

function appendSizeStyles(
  ctx: ComponentGenHelper,
  m: Map<string, string>,
  tpl: TplNode,
  vs: VariantSetting
) {
  const derived = deriveSizeStylesForTpl(ctx, tpl, vs);

  for (const [prop, val] of Object.entries(derived)) {
    if (
      m.has(prop) &&
      ["flex-shrink", "min-width", "min-height"].includes(prop)
    ) {
      // We automatically derive values for flex-shrink, min-width and min-height
      // based on the value set for Plasmic, but the user can also explicitly
      // override them with an explicit value.  In that case, use the user's
      // explicit override.
      continue;
    }
    if (isTokenRef(val)) {
      // If the value is a token ref, then it has been resolved in `m`,
      // so just use the resolved value
      continue;
    }

    m.set(prop, val);
  }

  // If any of the sizes are set to default, then this is a TplComponent; remove
  // size rule from `m` and let the root component class dictate the size
  for (const dim of ["width", "height"]) {
    if (m.get(dim) === "default") {
      m.delete(dim);
    }
  }
}

export function preferShorthand(m: Map<string, string>): Map<string, string> {
  const res = new Map(m);

  const useShorthand = (allProps: string[], shorthandProp: string) => {
    if (
      allProps.every(
        (s) =>
          m.has(s) &&
          !ensure(
            m.get(s),
            () => `Expected ${s} value, but got ${m.get(s)}`
          ).endsWith("!important")
      )
    ) {
      res.set(
        shorthandProp,
        showCssShorthand(
          allProps.map((key) =>
            ensure(
              m.get(key),
              () => `Expected ${key} value, but got ${m.get(key)}`
            )
          )
        )
      );
      allProps.forEach((key) => res.delete(key));
    }
  };

  useShorthand(
    standardCorners.map((s) => `border-${s}-radius`),
    "border-radius"
  );
  useShorthand(
    standardSides.map((s) => `padding-${s}`),
    "padding"
  );
  useShorthand(
    standardSides.map((s) => `margin-${s}`),
    "margin"
  );

  // border
  const borderProps = ["width", "style", "color"];
  for (const prop of borderProps) {
    const keys = standardSides
      .map((s) => `border-${s}-${prop}`)
      .filter((s) => m.has(s));
    const vals = keys.map((s) =>
      ensure(m.get(s), () => `Expected ${s} value, but got ${m.get(s)}`)
    );
    if (
      keys.length === standardSides.length &&
      vals.every((v) => v === vals[0])
    ) {
      res.set(`border-${prop}`, vals[0]);
      keys.forEach((s) => res.delete(s));
    }
  }

  for (const side of ["", ...standardSides]) {
    const shorthand = side ? `border-${side}` : "border";
    // These keys might not exist in `m` if created by the previous loop
    if (borderProps.every((p) => res.has(`${shorthand}-${p}`))) {
      res.set(
        shorthand,
        withoutNils(borderProps.map((s) => res.get(`${shorthand}-${s}`))).join(
          " "
        )
      );
      borderProps.forEach((s) => res.delete(`${shorthand}-${s}`));
    }
  }

  return res;
}

export const parseCssValue = (
  prop: string | undefined,
  input: /*TWZ*/ string
): string[] => {
  // This regexp removes only comments without *. It is intended to be used
  // only to remove comments generated for Plasmic tokens, which do not have
  // *.
  const withoutComments = input.replace(/\/\*[^*]*\*\//g, "").trim();
  return cssPegParser.parse(withoutComments, { startRule: "commaSepValues" });
};

function showStyles(m: Map<string, string>) {
  if (m.size === 0) {
    return undefined;
  }
  return `\
  ${[...preferShorthand(m).entries()]
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n")}\
  `;
}

export function hasClassnameOverride(tag?: string) {
  return tag && getTagsWithCssOverrides().includes(tag);
}

/**
 * Returns the number of TplComponent nestings.  For example, if you have
 *
 * TplComponent of Component A, which is rooted by:
 *   TplComponent of Component B, which is rooted by:
 *     TplComponent of Component C, which is rooted by:
 *       a div
 *
 * Then the component depth is 3
 */
function getComponentDepth(tpl: TplComponent) {
  let count = 1;
  while (isTplComponent(tpl.component.tplTree)) {
    tpl = tpl.component.tplTree;
    count += 1;
  }
  return count;
}

function maybeRule(
  ruleName: string,
  content: string | undefined
): string | undefined {
  return content
    ? `${ruleName} {
        ${content}
      }`
    : undefined;
}

function tagHasGapStyle(tpl: TplNode) {
  if (!isKnownTplTag(tpl)) {
    return false;
  }

  const component = $$$(tpl).tryGetOwningComponent();
  if (!component) {
    return false;
  }

  const site = tryGetOwnerSite(component);
  if (!site?.activeTheme) {
    return false;
  }

  const tagStyles = site.activeTheme.styles.find(
    (s) => s.selector.split(":")[0] === tpl.tag
  );
  if (!tagStyles) {
    return false;
  }

  return GAP_PROPS.some((p) => p in tagStyles.style.rs.values);
}

export function hasGapStyle(tpl: TplNode) {
  return (
    tagHasGapStyle(tpl) ||
    tpl.vsettings
      .flatMap((vs) => expandRuleSets([vs.rs]))
      .some((rs) => {
        return GAP_PROPS.some((p) => p in rs.values);
      })
  );
}

export function isValidGapContainer(_tpl: TplNode, _vs: VariantSetting) {
  // Should only return true if needsFakeFlexContainer (eval.ts) is properly updated
  return false;
  // const effectiveVs = getEffectiveVariantSetting(tpl, vs.variants);
  // return isTplTag(tpl) && isFlexContainerRsh(effectiveVs.rsh());
}

/**
 * Append flex styles, taking the flex and gap settings from theme
 * into account as well. We do this specifically for flex as we need
 * to carefully target some of these styles for the fake flex container,
 * some for flex children, etc., so we need the materialized settings
 * in our `m`.
 */
function appendEffectiveFlexStyles(
  ctx: ComponentGenHelper,
  m: Map<string, string>,
  tpl: TplNode,
  vs: VariantSetting
) {
  if (!isTplTag(tpl)) {
    return;
  }

  if (!isBaseVariant(vs.variants)) {
    // Only need to do this for the base variant
    return;
  }

  // This is basically the base + theme styles
  const effectiveExpr = ctx.getEffectiveExprWithTheme(tpl, vs.variants);
  for (const props of [FAKE_FLEX_CONTAINER_PROPS, GAP_PROPS]) {
    for (const prop of props) {
      const value = effectiveExpr.getRaw(prop);
      if (value && !m.has(prop)) {
        m.set(prop, value);
      }
    }
  }
}

function ensureGapStyles(m: Map<string, string>) {
  const res = new Map(m);
  // We have to ensure only that flex-column-gap/flex-row-gap are present so that the width and height
  // of the fake flex container is adjusted.
  res.set("flex-column-gap", "0px");
  res.set("flex-row-gap", "0px");
  return res;
}

function hasOutlineStyle(m: Map<string, string>) {
  return (
    m.has("outline-style") ||
    m.has("outline-width") ||
    m.has("outline-offset") ||
    m.has("outline-color")
  );
}

function showSelectorRuleSet(
  ruleName: string,
  srs: SelectorRuleSet,
  resolver?: CssVarResolver,
  isStudio?: boolean
) {
  const m = new Map<string, string>();
  for (const rule of Object.keys(srs.rs.values)) {
    const val = srs.rs.values[rule];
    // Treat the fake css props specially
    if (rule === css.PLASMIC_DISPLAY_NONE) {
      if (val === "true") {
        m.set("display", "none");
      } else {
        // Not sure what to use?
        m.set("display", "flex");
      }
    } else if (rule === "flex-column-gap") {
      // Relying on real css flex gap, as no way to polyfill here
      m.set("column-gap", val);
    } else if (rule === "flex-row-gap") {
      m.set("row-gap", val);
    } else if (isSizeProp(rule)) {
      m.set(rule, deriveSizeStyleValue(rule, val, isStudio));
    } else {
      m.set(rule, resolver?.tryResolveTokenRefs(val) ?? val);
    }
  }

  // Disable outline if any style has been set
  if (m.size > 0 && !hasOutlineStyle(m)) {
    m.set("outline", "none");
  }

  postProcessStyles(m, { isStudio });

  const ruleContent = showStyles(m);
  return ruleContent ? `${ruleName} { ${ruleContent} }` : undefined;
}

export function makeStyleExprClassName(expr: StyleExpr) {
  return `pcls_${expr.uuid}`;
}

function makeRootClassName(tpl: TplComponent, ruleNamer: RuleNamer) {
  return ruleNamer.classNamer(
    tpl,
    ensure(
      tryGetBaseVariantSetting(tpl),
      `All tpls must have base variant settings`
    )
  );
}

export function makeStyleScopeClassName(
  tpl: TplComponent,
  ruleNamer: RuleNamer,
  scope: string
) {
  const rootClassName = makeRootClassName(tpl, ruleNamer);
  return `${rootClassName}__${toVarName(scope)}`;
}

/**
 * Generates css rules for ClassNamePropType args in vs.args
 */
function showClassPropRuleSets(
  site: Site,
  tpl: TplComponent,
  vs: VariantSetting,
  ruleNamer: RuleNamer,
  opts?: {
    resolver?: CssVarResolver;
    isStudio?: boolean;
    useCssModules?: boolean;
  }
) {
  const rootClassName = makeRootClassName(tpl, ruleNamer);

  const comp = tpl.component;
  const customScopes = comp.params
    .filter((p) => isKnownStyleScopeClassNamePropType(p.type))
    .map((p) => ensureKnownStyleScopeClassNamePropType(p.type).scopeName);
  const scopes = [":component", ":self", ...customScopes];

  const customScopeClassNames = Object.fromEntries(
    customScopes.map((scope) => [
      scope,
      makeStyleScopeClassName(tpl, ruleNamer, scope),
    ])
  );

  const makeRuleName = (expr: StyleExpr, srs: SelectorRuleSet) => {
    const baseClassRule = `.${makeStyleExprClassName(expr)}`;
    if (srs.selector && srs.selector.length > 0) {
      let selector = srs.selector;
      if (!scopes.some((scope) => selector.includes(scope))) {
        // If no explicit scope reference, then assume the selector is to be
        // applied to the element
        selector = `:self${selector}`;
      }
      selector = (
        opts?.useCssModules
          ? selector.replaceAll(
              /(\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g,
              ":global($1)"
            )
          : selector
      )
        .replaceAll(":component", `.${rootClassName}`)
        .replaceAll(":self", baseClassRule);
      for (const scope of customScopes) {
        selector = selector.replace(
          `:${scope}`,
          `.${customScopeClassNames[scope]}`
        );
      }
      return selector;
    } else {
      return baseClassRule;
    }
  };

  const rules: string[] = [];
  for (const arg of vs.args) {
    const param = arg.param;
    if (isKnownStyleExpr(arg.expr)) {
      assert(
        isKnownClassNamePropType(param.type),
        "Only ClassNamePropType can have a StyleExpr arg"
      );
      const classNameType = param.type;
      const shouldGen = (sty: SelectorRuleSet) => {
        if (!sty.selector) {
          if (classNameType.selectors.some((s) => s.label === "Base")) {
            return false;
          }
        } else if (
          !classNameType.selectors.some((s) => s.selector === sty.selector)
        ) {
          return false;
        }
        return true;
      };
      for (const sty of arg.expr.styles) {
        // Skip over dangling selectors that are no longer defined
        // in the ClassNamePropType
        if (shouldGen(sty)) {
          const rule = showSelectorRuleSet(
            makeRuleName(arg.expr, sty),
            sty,
            opts?.resolver,
            opts?.isStudio
          );
          if (rule) {
            rules.push(rule);
          }
        }
      }
    }
  }
  return rules;
}

export const showSimpleCssRuleSet = (
  ctx: ComponentGenHelper,
  tpl: TplNode,
  vs: VariantSetting,
  ruleNamer: RuleNamer,
  opts: {
    targetEnv: TargetEnv;
    useCssModules?: boolean;
    onlyInteractiveCanvasPseudoClasses?: boolean;
    whitespaceNormal?: boolean;
    useCssFlexGap?: boolean;
  }
): string[] => {
  const site = ctx.site;
  const resolver = ctx.resolver;
  const isStudio = ctx.isStudio;
  const useCssModules = opts.useCssModules;

  let ruleName = ruleNamer(tpl, vs);

  if (isStudio && opts.onlyInteractiveCanvasPseudoClasses) {
    if (!ruleName.includes(":")) {
      return [];
    } else {
      ruleName = `.__interactive_canvas ${ruleName}`;
    }
  }

  const getGlobalClassSelector = (className: string) =>
    opts.useCssModules ? `:global(.${className})` : `.${className}`;

  const rawStyles = deriveCssRuleSetStyles(ctx, tpl, vs, opts);

  const hasGap = ctx.hasGapStyle(tpl);

  // If we are dealing with a TplTag that is a FlexContainer and we are in the studio,
  // we are going to enforce the gap properties, this makes the html tree to be the
  // same even after adding/removing gap styles, which allows smooth control from
  // canvas controls. (i.e GapCanvasControls).
  const shouldHaveGapStyles =
    hasGap || (isStudio && isValidGapContainer(tpl, vs));

  const shouldWrapFlexChildren = shouldHaveGapStyles && !opts.useCssFlexGap;

  // If we are dealing with columns in base variant ensure that we have a gap variable to be used in the container
  const ensureColGapVariable = isTplColumns(tpl) && isBaseVariant(vs.variants);

  const styles =
    shouldHaveGapStyles && !hasGap ? ensureGapStyles(rawStyles) : rawStyles;

  const rules: (string | undefined)[] = [];

  if (ensureColGapVariable) {
    // It's fine to set it to 0px, since it will be overridden by the
    // parent fake flex container if it's not 0px
    styles.set("--plsmc-rc-col-gap", "0px");
  }

  // If any variant has gap styles, we should generate styles to provide
  // styles to both wrapper and the container, since different variants might
  // expect to inherit styles to both containers.
  if (shouldHaveGapStyles) {
    if (isTplCodeComponent(tpl) || !shouldWrapFlexChildren) {
      // For code components, we set real column/row gap styles
      if (styles.has("flex-column-gap")) {
        styles.set("column-gap", styles.get("flex-column-gap")!);
      }
      if (styles.has("flex-row-gap")) {
        styles.set("row-gap", styles.get("flex-row-gap")!);
      }
    } else {
      appendEffectiveFlexStyles(ctx, styles, tpl, vs);
      const flexContainerName = getGlobalClassSelector(
        makeWabFlexContainerClassName(opts)
      );
      const slotName = getGlobalClassSelector(makeWabSlotClassName(opts));
      rules.push(
        // container styles
        maybeRule(
          ruleName,
          showStyles(deriveFlexContainerStyles(new Map<string, string>(styles)))
        ),
        // flex wrapper styles
        maybeRule(
          `${ruleName} > ${flexContainerName}`,
          showStyles(
            deriveFakeFlexContainerStyles(
              new Map<string, string>(styles),
              isTplColumns(tpl)
            )
          )
        ),
        // Apply spacing to the container child elements.  Also apply across
        // .__wab_slot, since __wab_slot has display:contents and so it itself
        // is not part of the layout
        maybeRule(
          `${ruleName} > ${flexContainerName} > *, ${ruleName} > ${flexContainerName} > ${slotName} > *, ${ruleName} > ${flexContainerName} > picture > img, ${ruleName} > ${flexContainerName} > ${slotName} > picture > img`,
          showStyles(
            deriveFakeFlexContainerChildrenStyles(
              new Map<string, string>(styles)
            )
          )
        )
      );
    }
  }

  styles.delete("flex-column-gap");
  styles.delete("flex-row-gap");

  if (isTplComponent(tpl)) {
    // For TplComponents, its positioning class name is going onto the root
    // element of the component.  In order to override the root element's
    // class, we need to make sure the positioning class rule has higher
    // specificity.  We thus repeat an additional .__wab_instance selector
    // per "depth"; if this is a TplComponent for a Component rooted in div,
    // then there's one __wab_instance; if this is a TplComponent for a
    // Component rooted in another TplComponet for a Component rooted in div,
    // then there's two __wab_instance.  Thus the "outer-most" TplComponent's
    // class rule wins.
    rules.push(
      maybeRule(
        `${ruleName}${L.repeat(
          getGlobalClassSelector(makeWabInstanceClassName(opts)),
          getComponentDepth(tpl)
        )}`,
        showStyles(styles)
      ),
      ...showClassPropRuleSets(site, tpl, vs, ruleNamer, {
        resolver,
        isStudio,
        useCssModules,
      })
    );
  } else if (isStyledTplSlot(tpl)) {
    const uninheritedProps = [...styles.keys()].filter(
      (p) => !inheritableCssProps.includes(p)
    );

    if (uninheritedProps.length === 0) {
      rules.push(maybeRule(ruleName, showStyles(styles)));
    } else {
      // TplSlot has `display: contents`.  However, certain css props that you can set
      // on the TplSlot do not get propagated via inheritance.  Specifically,
      //
      // * text-decoration-line is propagated via the box tree
      //   (see See https://github.com/w3c/csswg-drafts/issues/1136)
      // * text-overflow is not inherited
      // * overflow is not inherited.
      //
      // For these, we propagate to its children instead directly.
      //
      // We don't do this for all styles, just these styles, because we want
      // slot styles to be obtained via css inheritance, which is always lower priority
      // than any properly from the cascade, which means the slot styles from inheritance
      // will not interfere with explicit styles set on slot content.  When we do
      // `> *`, we are now propagating styles via the cascade instead of inheritance, and
      // this rule will have the same precedence as any child's explicit class, which means
      // we depends on this rule being declared first (and so will be overwritten by the
      // child's explicit class).  This is not guaranteed to be the case, so we have a
      // bug here where if the slot sets `text-decoration-line: line-through` and slot
      // content has `text-decoration-line: none`, then the slot content may or may not
      // see the line-through depending on the css declaration order.  Therefore, in
      // isTextArgNodeOfSlot branch below, we make sure the precedence is higher by
      // using !important.
      const inheritedProps = [...styles.keys()].filter(
        (p) => !uninheritedProps.includes(p)
      );
      const inheritedStyles = showStyles(
        new Map(
          inheritedProps.map((p) =>
            tuple(
              p,
              ensure(
                styles.get(p),
                () => `Expected ${p} value, but got ${styles.get(p)}`
              )
            )
          )
        )
      );
      const uninheritedTextStyles = showStyles(
        xpickExists(styles, ...nonInheritableTypographCssProps)
      );
      const otherUninheritedStyles = showStyles(
        xpickBy(
          styles,
          (val, key) =>
            !inheritedProps.includes(key) &&
            !nonInheritableTypographCssProps.includes(key)
        )
      );
      const textClass = getGlobalClassSelector(makeWabTextClassName(opts));
      const textHtmlClass = getGlobalClassSelector(
        makeWabHtmlTextClassName(opts)
      );
      const slotStringWrapperClass = getGlobalClassSelector(
        makeWabSlotStringWrapperClassName(opts)
      );
      const slotClass = getGlobalClassSelector(makeWabSlotClassName(opts));
      const editorClass = getGlobalClassSelector("__wab_editor");
      const editingClass = getGlobalClassSelector("__wab_editing");
      const richTextClass = getGlobalClassSelector("__wab_rich_text");
      rules.push(
        // For all inherited styles, we just need them for the slot element
        maybeRule(ruleName, inheritedStyles),

        // We pass the uninherited text styles to > __wab_text, and also through nested slots. We target
        // both the nested .__wab_slot and .__wab_text, because if the text is otherwise not styled,
        // then there may not be a wrapping .__wab_text at all, and we need to depend on the
        // wrapping .__wab_slot.
        // Unfortunately I don't think there's a general way to pass this down an arbitrary number of
        // nesting, so we will just do...  a few...
        maybeRule(
          [
            // Target direct child text node of the slot; either __wab_text if it's styled,
            // or __wab_slot-string-wrapper if it's unstyled
            `${ruleName} > ${textClass}`,
            `${ruleName} > ${textHtmlClass}`,
            `${ruleName} > ${slotStringWrapperClass}`,

            // Target one level of nesting
            `${ruleName} > ${slotClass} > ${textClass}`,
            `${ruleName} > ${slotClass} > ${textHtmlClass}`,
            `${ruleName} > ${slotClass} > ${slotStringWrapperClass}`,

            // Target two levels of nesting
            `${ruleName} > ${slotClass} > ${slotClass} > ${textClass}`,
            `${ruleName} > ${slotClass} > ${slotClass} > ${textHtmlClass}`,
            `${ruleName} > ${slotClass} > ${slotClass} > ${slotStringWrapperClass}`,

            // Target three levels of nesting
            `${ruleName} > ${slotClass} > ${slotClass} > ${slotClass} > ${textClass}`,
            `${ruleName} > ${slotClass} > ${slotClass} > ${slotClass} > ${textHtmlClass}`,
            `${ruleName} > ${slotClass} > ${slotClass} > ${slotClass} > ${slotStringWrapperClass}`,
          ].join(","),
          uninheritedTextStyles
        ),

        // We pass the other uninherited props to "> *".  There aren't many styles applied to TplSlots
        // that are not typography; the only kind should be margin coming from fake flex gaps.
        maybeRule(
          [
            `${ruleName} > *`,
            `${ruleName} > ${slotClass} > *`,
            `${ruleName} > ${slotClass} > ${slotClass} > *`,
            `${ruleName} > ${slotClass} > ${slotClass} > ${slotClass} > * `,

            // If we're using PlasmicImg, the images will be wrapped by <picture>, so
            // we should also target its children
            `${ruleName} > picture > img`,
            `${ruleName} > ${slotClass} > picture > img`,
            `${ruleName} > ${slotClass} > ${slotClass} > picture > img`,
            `${ruleName} > ${slotClass} > ${slotClass} > ${slotClass} > picture > img `,
          ].join(","),
          otherUninheritedStyles
        ),

        // If we're generating css for the canvas, not for codegen (if resolver is undefined),
        // then also target the children of rich text component
        !resolver
          ? maybeRule(
              `${ruleName} > ${editorClass}:not(${editingClass}) > ${richTextClass} > *, ${ruleName} > ${slotClass} > ${editorClass}:not(${editingClass}) > ${richTextClass} > *, ${ruleName} > ${slotClass} > ${slotClass} > ${editorClass}:not(${editingClass}) > ${richTextClass} > *, ${ruleName} > ${slotClass} > ${slotClass} > ${slotClass} > ${editorClass}:not(${editingClass}) > ${richTextClass} > * `,
              uninheritedTextStyles || otherUninheritedStyles
                ? `${uninheritedTextStyles ?? ""}\n${
                    otherUninheritedStyles ?? ""
                  }`
                : undefined
            )
          : undefined
      );
    }
  } else if (ctx.isTextArgNodeOfSlot(tpl)) {
    // For isStyledTplSlot above, we target children text node explicitly with uninheritable
    // text css.  But that means if the child text node needs to override the slot's
    // uninheritable text css, we need to make sure that the overriding css has higher precedence.
    // For example, maybe the slot has style "text-decoration-line: underline", but the text
    // arg has "text-decoration-line: none".  We need to make sure the latter has higher precedence.
    // Unfortunately the only way to be sure is to use !important :-/
    const maybeAddImportant = (val: string, prop: string) =>
      nonInheritableTypographCssProps.includes(prop)
        ? `${val} !important`
        : val;
    const overridingStyles = showStyles(xMapValues(styles, maybeAddImportant));
    const overridingTypographyStyles = showStyles(
      xMapValues(
        xpickBy(
          styles,
          (val, key) => typographyCssProps.includes(key) || key === "overflow"
        ),
        maybeAddImportant
      )
    );
    rules.push(
      maybeRule(ruleName, overridingStyles),
      !resolver
        ? maybeRule(
            `${ruleName} > ${getGlobalClassSelector("__wab_rich_text")} > *`,
            overridingTypographyStyles
          )
        : undefined
    );
  } else if (isTplPicture(tpl)) {
    rules.push(
      maybeRule(ruleName, showStyles(styles)),
      maybeRule(
        `${ruleName} > picture > img`,
        showStyles(xpickExists(styles, ...imageCssProps))
      )
    );
  } else if (isTplTextBlock(tpl)) {
    const getRichTextStyles = () => {
      const nonInheritedTextStyleProps = new Set([
        "overflow",
        "text-overflow",
        "vertical-align",
      ]);

      return new Map(
        [...styles.entries()].filter(([k]) => nonInheritedTextStyleProps.has(k))
      );
    };

    rules.push(
      maybeRule(ruleName, showStyles(styles)),
      // On canvas, we need to apply the styles deeper into slate, since some of the
      // styles are not just cascaded -- specifically, for `text-overflow: ellipsis`.
      // Note, though, that we only do so when not editing the text, otherwise
      // you'll just see ellipsis while you're changing the content.
      !resolver
        ? maybeRule(
            `${ruleName}:not(.__wab_editing) > .__wab_rich_text > *`,
            showStyles(getRichTextStyles())
          )
        : undefined
    );
  } else if (!shouldHaveGapStyles || !shouldWrapFlexChildren) {
    // For "normal" elements, add the styles.  For containers with flex gap
    // that wrap children, then the styles are already applied earlier in the
    // function.
    rules.push(maybeRule(ruleName, showStyles(styles)));
  }

  if (isContentLayoutTpl(tpl)) {
    rules.push(maybeRule(`${ruleName} > *`, `grid-column: 4`));
  }

  if (isTplColumns(tpl)) {
    rules.push(
      ...deriveResponsiveColumnsSizesRules(
        ctx,
        tpl,
        vs,
        shouldWrapFlexChildren
          ? `${ruleName} > ${getGlobalClassSelector(
              makeWabFlexContainerClassName(opts)
            )}`
          : ruleName
      )
    );
  }

  if (styles.has("transform-style")) {
    rules.push(
      maybeRule(
        `${ruleName} *`,
        showStyles(
          new Map([["transform-style", styles.get("transform-style")!]])
        )
      )
    );
  }

  return withoutNils(rules);
};

type RuleNamer = {
  classNamer: (tpl: TplNode, vs: VariantSetting) => string;
  (tpl: TplNode, vs: VariantSetting): string;
};

/**
 * Returns a RuleNamer that uses names from ruleNamer, but appends any
 * pseudoelement selectors like ::placeholder.
 */
export function makePseudoElementAwareRuleNamer(
  ruleNamer: RuleNamer
): RuleNamer {
  const namer = (tpl: TplNode, vs: VariantSetting) => {
    const maybeSv = tryGetPrivateStyleVariant(vs.variants);
    const target = (maybeSv ? maybeSv.selectors || [] : [])
      .filter((sel) => sel.startsWith("::"))
      .join("");
    return `${ruleNamer(tpl, vs)}${target}`;
  };
  namer.classNamer = ruleNamer.classNamer;
  return namer;
}

export function makeBaseRuleNamer(
  classNamer: RuleNamer["classNamer"]
): RuleNamer {
  const ruleNamer = (tpl: TplNode, vs: VariantSetting) =>
    `.${classNamer(tpl, vs)}`;
  ruleNamer.classNamer = classNamer;
  return ruleNamer;
}

/**
 * Returns a RuleNamer that is aware of pseudo-classes like :hover and also
 * pseudo-elements like
 * ::placeholder, and will name the rule name appropriately based on present
 * style variants.
 */
export function makePseudoClassAwareRuleNamer(
  component: Component,
  ruleNamer: RuleNamer
): RuleNamer {
  const namer = (tpl: TplNode, vs: VariantSetting) =>
    showPseudoClassSelector(component, tpl, vs, ruleNamer);
  namer.classNamer = ruleNamer.classNamer;
  return namer;
}

/**
 * Returns the css rule name for this VariantSetting, applying the style
 * variant selectors appropriately.  Note that this only cares about
 * pseudo-classes, not pseudo-elements.
 *
 * If there's no style variants, then the rule name will just be ruleNamer(tpl,
 * vs). If there are style variants, then the css pseudo-classes will be
 * applied to the rule name.
 */
function showPseudoClassSelector(
  component: Component,
  tpl: TplNode,
  vs: VariantSetting,
  ruleNamer: RuleNamer
) {
  // We don't need to deal with screen variants, as they are dealt with via
  // media query in the generated css
  const variants = vs.variants.filter((v) => !isScreenVariant(v));
  const [
    privateStyleVariants,
    styleVariants,
    codeComponentVariants,
    compVariants,
    globalVariants,
  ] = partitionVariants(component, variants);

  if (
    privateStyleVariants.length === 0 &&
    styleVariants.length === 0 &&
    codeComponentVariants.length === 0
  ) {
    // No style variants are involved at all, the easy case!
    return ruleNamer(tpl, vs);
  }

  const nonStyleVariants = [...compVariants, ...globalVariants];

  // At this point, we have a VariantSetting for a tpl in a component.  This
  // component has the `nonStyleVariants` variants activated, with the
  // `styleVariants` component-level style variants activated, and `privateStyleVariants`
  // private style variants.
  //
  // Component-level style variants are applied to the root element, while the
  // private style variants are applied to the tpl.  So the rules usually look
  // something like:
  //
  //   .root-vs:comp-selector1:comp-selector2 .tpl-vs:private-selector1
  //
  // The "vs" above that is used to name the root is the variant setting corresponding
  // to nonStyleVariants.

  const root = ensureInstance(component.tplTree, TplTag, TplComponent);
  const isRoot = root === tpl;

  const makeSelectorString = (svs: Variant[]) => {
    return L(svs)
      .flatMap((sv) =>
        ensure(
          isCodeComponentVariant(sv)
            ? sv.codeComponentVariantKeys
            : sv.selectors,
          `Expected variant ${sv.name} (${sv.uuid}) to have ${
            isCodeComponentVariant(sv) ? "variant keys" : "selectors"
          }`
        )
      )
      .map((sel) => {
        const pseudoSelectorOption = getPseudoSelector(sel);
        if (pseudoSelectorOption) {
          return pseudoSelectorOption;
        } else {
          // This is either an arbitrary selector or a code component variant
          // we validate if it's a code component variant by looking at the root
          // tpl of the current component
          const codeComponentVariantMeta =
            isTplCodeComponent(root) &&
            getTplCodeComponentVariantMeta(root, sel);
          if (codeComponentVariantMeta) {
            return codeComponentVariantMeta.cssSelector;
          }
          return sel;
        }
      })
      .filter((sel) => {
        if (L.isString(sel)) {
          return true;
        }
        return !sel.cssSelector.startsWith("::") && !sel.trigger?.alwaysByHook;
      })
      .map((sel) => {
        if (L.isString(sel)) {
          return sel;
        }
        return sel.cssSelector;
      })
      .join("");
  };

  const getBaseRuleVariants = (combo: Variant[]) => {
    return combo.filter(isBaseRuleVariant);
  };

  if (isRoot) {
    const styleOrCodeComponentVariants = vs.variants.filter(
      isStyleOrCodeComponentVariant
    );
    const baseRuleVariants = getBaseRuleVariants(vs.variants);
    const baseRuleVs = ensure(
      tryGetVariantSetting(root, baseRuleVariants),
      () =>
        `Expected VariantSettings in tpl ${root.uuid} for combo ` +
        baseRuleVariants.map((v) => `${v.name} (${v.uuid})`).join(", ")
    );
    return `${ruleNamer(root, baseRuleVs)}${makeSelectorString(
      styleOrCodeComponentVariants
    )}`;
  }

  const parts: string[] = [];

  const baseRootRuleVs = ensure(
    tryGetVariantSetting(root, nonStyleVariants),
    () =>
      `Expected VariantSettings in tpl ${root.uuid} for combo ` +
      nonStyleVariants.map((v) => `${v.name} (${v.uuid})`).join(", ")
  );
  parts.push(
    `${ruleNamer(root, baseRootRuleVs)}${makeSelectorString([
      ...styleVariants,
      ...codeComponentVariants,
    ])}`
  );

  const baseRuleVariants = getBaseRuleVariants([
    ...nonStyleVariants,
    ...styleVariants,
    ...codeComponentVariants,
    ...privateStyleVariants,
  ]);
  const baseRuleVs = ensure(
    tryGetVariantSetting(tpl, baseRuleVariants),
    () =>
      `Expected VariantSettings in tpl ${root.uuid} for combo ` +
      baseRuleVariants.map((v) => `${v.name} (${v.uuid})`).join(", ")
  );
  parts.push(
    `${ruleNamer(tpl, baseRuleVs)}${makeSelectorString(privateStyleVariants)}`
  );

  return parts.join(" ");
}

/**
 * Derives styles to use for a TplTag with flex gap
 */
function deriveFlexContainerStyles(styles: Map<string, string>) {
  // Here, we retain all its styles, except for the flex layout related props,
  // which will be absorbed by its only child, the __wab_flex-container.
  for (const prop of FAKE_FLEX_CONTAINER_PROPS) {
    if (prop !== "flex-direction") {
      // Keep flex-direction intact, as that's how DND determins the flow direction.
      // Doesn't matter as there will only be one child.
      styles.delete(prop);
    }
  }
  styles.delete("flex-column-gap");
  styles.delete("flex-row-gap");

  return styles;
}

/**
 * Derives styles to use for the __wab_flex-container container that
 * actually implements the flex layout for a TplTag with flex gap
 */
function deriveFakeFlexContainerStyles(
  styles: Map<string, string>,
  withRcColGapVar: boolean
) {
  // For "fake-container" (__wab_flex-container), we use all the flex layout props
  // from the Tpl node, and nothing else.
  const colGap = styles.get("flex-column-gap");
  const rowGap = styles.get("flex-row-gap");
  for (const prop of Array.from(styles.keys())) {
    if (
      (prop === "min-width" || prop === "min-height") &&
      styles.get(prop) === "0"
    ) {
      // We want to keep min-width:0 or min-height:0 on the __wab_flex-container,
      // if it was applied to the TplTag to get around flex min size, so that the
      // actual flex container will also have its size constrained.
      // See https://app.shortcut.com/plasmic/story/19624/layout-puzzler-or-bug
      continue;
    }
    if (!FAKE_FLEX_CONTAINER_PROPS.includes(prop)) {
      styles.delete(prop);
    }
  }

  // Then, we offset the margin left/top by the gap amount, to make space for
  // the padding of the children against the left/top edge.
  // We do `calc(0px - ...)` here because colGap may be a mixin prop ref, and so
  // we can't just do `-${colGap}` but have to compute that value instead.
  if (colGap && (isExplicitSize(colGap) || isTokenRef(colGap))) {
    styles.set("margin-left", `calc(0px - ${colGap})`);

    // Note we need to make sure that the width is 100% + colGap, because of
    // the margin-left.  That is, we want __wab_flex-container to be as
    // wide as its parent, PLUS the colGap.  That's because if you have
    // align-items: center, the children will be centered by this container,
    // but the container has been shifted left by `colGap`, so the children
    // will look off-center.
    styles.set("width", `calc(100% + ${colGap})`);

    if (withRcColGapVar) {
      // We add a variable so that we can use it in responsive columns styles
      styles.set("--plsmc-rc-col-gap", colGap);
    }
  }
  if (rowGap && (isExplicitSize(rowGap) || isTokenRef(rowGap))) {
    // Note that against the recommendation of https://gist.github.com/OliverJAsh/7f29d0fa1d35216ec681d2949c3fe8b7
    // we are using margin-top instead of margin-bottom.
    // That's because using a negative margin-bottom will increase the height
    // of this element, and if the parent of this element has `overflow: auto`, then
    // we are stuck with an unsightly scrollbar!  However, we do not suffer the
    // overlapping consequences warned by the above link.  That's because
    // this element that we are pushing up with negative top margin is transparent /
    // invisible, and has pointer-events: none; any background / border styling that
    // might obscure content is actually set on this element's parent (the "orig"),
    // which is laid out the way it should be without any funky negative margins.
    styles.set("margin-top", `calc(0px - ${rowGap})`);
    styles.set("height", `calc(100% + ${rowGap})`);
  }
  return styles;
}

/**
 * Derive styles to use for `__wab_flex-container > *`
 */
function deriveFakeFlexContainerChildrenStyles(styles: Map<string, string>) {
  // For each flex child, we apply a margin corresponding to the gap.  This is applied
  // to the children as `.__wab_flex-container > *`.  Note that this is against
  // the recommendation of https://gist.github.com/OliverJAsh/7f29d0fa1d35216ec681d2949c3fe8b7
  // We can't just use padding, because the child element may have border /
  // background, and adding padding arbitrarily will distort how the child element
  // looks.  It's possible to do this in a transparent wrapper instead, but that would
  // require that we wrap every DOM child of the flex container, which we cannot
  // reliably do, especially if the user can swap in arbitrary React elements for
  // the children.  Using a wrapper is also challenging, in that the wrapper needs to
  // reflect the "sizing" of the child (so if child has width or flex-grow set, the
  // wrapper needs to as well), which again is challenging if the child can be
  // swapped with arbitrary React elements.
  //
  // Using margin has all the faults pointed out by the above link, including:
  // 1. Conflicts with children margin
  // 2. If children have sizes specified as %, those sizes would not include the gaps
  const colGap = styles.get("flex-column-gap");
  const rowGap = styles.get("flex-row-gap");
  const m = new Map<string, string>();

  if (colGap && (isExplicitSize(colGap) || isTokenRef(colGap))) {
    m.set("margin-left", colGap);
  }

  if (rowGap && (isExplicitSize(rowGap) || isTokenRef(rowGap))) {
    m.set("margin-top", rowGap);
  }
  return m;
}

function deriveResponsiveColumnsSizesRules(
  ctx: ComponentGenHelper,
  tpl: TplNode,
  vs: VariantSetting,
  ruleName: string
) {
  if (!vs.columnsConfig) {
    return [];
  }

  const config = vs.columnsConfig;

  const colsSizes = config?.colsSizes || [12];
  const numCols = colsSizes.length;

  /**
  Responsive columns depend on the flex-column-gap setting because of the way sizing is going
  to be calculated. The size of each column is going to be calculated as a percentage of the
  parent container, and the parent container is going to have a margin-left set to the
  flex-column-gap setting. This means that the size of each column is going to be reduced by
  the amount of the gap. So to make sure that the size of the columns works as expected, the
  space each column can take up is reduced by the gap amount that is set on the parent container.

  Simple CSS demo of the problem:
  .rc-container (equivalent to a fake flex container)
    display: flex;
    flex-wrap: wrap;
    width: calc(100% + 20px);
    height: 120px;
    margin-left: calc(0px - 20px);
  .rc-child
    width: 50%;
    margin-left: 20px;

  A rc-container with 2 rc-child elements won't have both children in the same row.
   */
  const parentWidth = `(100% - ${numCols} * var(--plsmc-rc-col-gap, 0px))`;
  return L.range(numCols).map((_, idx) => {
    const m = new Map<string, string>();
    const size = colsSizes[idx % numCols];
    const widthProp = `calc(${parentWidth} * ${size} / ${12})`;
    m.set("width", widthProp);
    return maybeRule(
      `${ruleName} > :nth-child(${numCols}n + ${idx + 1})`,
      showStyles(m)
    );
  });
}

export const classNameForRuleSet = (rs: RuleSet) => `uid-${rs.uid}`;

export const classNameToRuleSetUid = (className: string) =>
  +ensure(
    /uid-(.*)/.exec(className),
    () => "Failed to parse className " + className
  )[1];

export interface TriggerCondition {
  hookName: string;
  isOpposite?: boolean;
  alwaysByHook?: boolean;
  eventPropNames?: string[];
}

export function getTriggerableSelectors(sv: Variant) {
  return ensure(
    sv.selectors,
    () => `Expected variant ${sv.name} (${sv.uuid}) to have selectors`
  )
    .map(getPseudoSelector)
    .filter(notNil)
    .filter((opt) => !!opt.trigger);
}

export class PseudoSelectorOption {
  // the opposite of this option e.g. "Not X"
  opposite: PseudoSelectorOption | undefined = undefined;

  constructor(
    readonly displayName: string,
    readonly cssSelector: string,
    readonly isPseudoElement: boolean,
    // undefined means it is applicable to all tags
    readonly applicableTags: string[] | undefined,
    // if true, then can only be applied to non-empty elements
    readonly isWithin: boolean | undefined,
    // name of the selector as identifier
    readonly capitalName: string,
    readonly trigger?: TriggerCondition
  ) {}
  applicable(
    forTag: string,
    forPrivateStyleVariant: boolean,
    forRoot: boolean
  ) {
    if (!forPrivateStyleVariant && this.isPseudoElement) {
      // Can only use pseudoElement selectors for private style variants
      return false;
    }
    if (this.applicableTags && !this.applicableTags.includes(forTag)) {
      // Does not satisfy the tags filter
      return false;
    }
    if (forRoot && forPrivateStyleVariant && !this.isPseudoElement) {
      // Can only use pseudo element selectors for the root element
      return false;
    }
    if (this.isWithin && !canTagHaveChildren(forTag)) {
      // Can only use :-within selectors for non-empty elements
      return false;
    }
    return true;
  }
}

export const pseudoSelectors = (() => {
  const opts = new Array<PseudoSelectorOption>();
  const addSelector = (
    displayName: string,
    cssSelector: string,
    applicableTags: string[] | undefined,
    isWithin: boolean,
    trigger?: TriggerCondition
  ) => {
    const isPseudoElement = cssSelector.startsWith("::");
    const capitalName = capCamelCase(cssSelector);
    const option = new PseudoSelectorOption(
      displayName,
      `${cssSelector}`,
      isPseudoElement,
      applicableTags,
      isWithin,
      capitalName,
      trigger
    );
    opts.push(option);

    if (!isPseudoElement) {
      const oppositeOption = new PseudoSelectorOption(
        `Not ${displayName}`,
        `:not(${cssSelector})`,
        false,
        applicableTags,
        isWithin,
        `Not${capitalName}`,
        trigger
          ? {
              hookName: trigger.hookName,
              isOpposite: true,
              alwaysByHook: trigger.alwaysByHook,
              eventPropNames: trigger.eventPropNames,
            }
          : undefined
      );
      oppositeOption.opposite = option;
      option.opposite = oppositeOption;
      opts.push(oppositeOption);
    }
  };
  // This is the order in which these selectors show up in selectors-building UI

  // Placeholder style for input/textarea
  addSelector("Placeholder", "::placeholder", ["input", "textarea"], false);

  // Triggered when an element is hovered. Generic to all elements.
  // Note: whenever we add a enableEvent or disableEvent, make sure we also add
  // them to code-merger's CodeVersion.rename list!
  addSelector("Hover", ":hover", undefined, false, {
    hookName: "useHover",
    eventPropNames: ["onMouseEnter", "onMouseLeave"],
  });
  addSelector("Pressed", ":active", undefined, false, {
    hookName: "usePressed",
    eventPropNames: ["onMouseDown", "onMouseUp"],
  });
  addSelector(
    "Focused",
    ":focus",
    ["input", "textarea", "button", "a"],
    false,
    {
      hookName: "useFocused",
      eventPropNames: ["onFocus", "onBlur"],
    }
  );
  addSelector(
    "Focus Visible",
    ":focus-visible",
    ["input", "textarea", "button", "a"],
    false,
    {
      hookName: "useFocusVisible",
      // No wide cross browser support yet
      alwaysByHook: true,
      eventPropNames: ["onFocus", "onBlur"],
    }
  );
  addSelector("Focused Within", ":focus-within", undefined, true, {
    hookName: "useFocusedWithin",
    eventPropNames: ["onFocus", "onBlur"],
  });
  addSelector(
    "Focus Visible Within",
    ":focus-visible-within",
    undefined,
    true,
    {
      hookName: "useFocusVisibleWithin",
      // Not a real selector; https://github.com/WICG/focus-visible/issues/151
      alwaysByHook: true,
      eventPropNames: ["onFocus", "onBlur"],
    }
  );
  addSelector("Disabled", ":disabled", ["input", "textarea", "button"], false);
  addSelector("Visited", ":visited", ["a"], false);
  addSelector("Link", ":link", ["a"], false);
  return opts;
})();

export function getApplicableSelectors(
  forTag: string,
  forPrivateStyleVariant: boolean,
  forRoot: boolean
) {
  return pseudoSelectors.filter((opt) =>
    opt.applicable(forTag, forPrivateStyleVariant, forRoot)
  );
}

/** Given a CSS selector, tries to find the preset option. */
export function getPseudoSelector(
  cssSelector: string
): PseudoSelectorOption | undefined {
  return pseudoSelectors.find((s) => s.cssSelector === cssSelector);
}

export const tryAugmentRulesWithScreenVariant = (
  rules: string[],
  vs: VariantSetting
) => {
  // Add media query based on global screen variants
  const globalScreenVariants = getGlobalVariants(vs.variants).filter(
    (v) => v.mediaQuery
  );
  return rules.map((rule) => {
    const pre = globalScreenVariants
      .map((v) => `@media ${v.mediaQuery} {`)
      .join(" ");
    const end = globalScreenVariants.map((_v) => "}").join(" ");
    return `${pre} ${rule} ${end}`;
  });
};

const nonTypographyThemeableProps = [];

export const themeableProps = [
  ...typographyCssProps,
  ...nonTypographyThemeableProps,
];

export const imageBlobUrl = new Map<string, string>();

const genMixinVarsRules = (
  mixin: Mixin,
  rs: RuleSet,
  vsh: VariantedStylesHelper,
  opts?: {
    onlyBoxShadow?: boolean;
    whitespace?: "enforce" | "normal";
    cssVariableInfix?: string;
  }
) => {
  let values = opts?.onlyBoxShadow ? pick(rs.values, "box-shadow") : rs.values;
  if (opts?.whitespace === "enforce" && !("white-space" in values)) {
    values = { ...values };
    values["white-space"] = "pre-wrap";
  }
  return Object.keys(values).map((rule) => {
    const val = values[rule];
    return {
      varRule: `${getMixinPropVarName(
        mixin,
        rule,
        false,
        opts?.cssVariableInfix
      )}: ${
        rule === "white-space" && opts?.whitespace === "normal"
          ? normalizeWhitespace(val)
          : rule === "font-family"
          ? extendFontFamilyWithFallbacks(splitCssValue("font-family", val))
          : val
      }`,
      vsh,
      externalVarRule: `${getExternalMixinPropVarName(
        mixin,
        rule
      )}: ${mkMixinPropRef(mixin, rule, false)}`,
    };
  });
};

export const makeMixinVarsRules = (
  site: Site,
  mixins: Mixin[],
  rootCssSelector: string,
  opts: {
    targetEnv: TargetEnv;
    prefixClassName?: string;
    generateExternalCssVar?: boolean;
    onlyBoxShadow?: boolean;
    whitespace?: "enforce" | "normal";
    cssVariableInfix?: string;
  }
) => {
  if (!opts.whitespace) {
    opts.whitespace = getProjectFlags(site).useWhitespaceNormal
      ? "normal"
      : "enforce";
  }
  const mixinVars = mixins.flatMap((mixin) => [
    ...genMixinVarsRules(mixin, mixin.rs, new VariantedStylesHelper(), opts),
    ...(mixin.variantedRs?.flatMap((vRs) =>
      genMixinVarsRules(
        mixin,
        vRs.rs,
        new VariantedStylesHelper(site, vRs.variants),
        opts
      )
    ) ?? []),
  ]);

  const groupedMixinVars = L.groupBy(mixinVars, (el) => el.vsh.key());

  const nonScreenGlobalVariants = site.globalVariantGroups.flatMap(
    (variantGroup) => variantGroup.variants.filter((v) => !isScreenVariant(v))
  );

  const nonScreenGlobalVariantCssSelector = (variantCombo) =>
    `${rootCssSelector}:where(.${makeCssClassNameForVariantCombo(variantCombo, {
      targetEnv: opts.targetEnv,
      prefix: opts.prefixClassName,
    })})`;

  const sorter = makeGlobalVariantComboSorter(site);

  return [
    ...L.keys(groupedMixinVars)
      .sort((a, b) => {
        const vshA = groupedMixinVars[a][0].vsh;
        const vshB = groupedMixinVars[b][0].vsh;

        return sorter(vshA.globalVariants() ?? []) <
          sorter(vshB.globalVariants() ?? [])
          ? -1
          : 1;
      })
      .map((key) => {
        const activeGlobalVariants =
          groupedMixinVars[key][0].vsh.globalVariants() ?? [];

        const activeNonScreenGlobalVariants = activeGlobalVariants.filter(
          (v) => !isScreenVariant(v)
        );

        const selector =
          activeNonScreenGlobalVariants.length > 0
            ? nonScreenGlobalVariantCssSelector(activeNonScreenGlobalVariants)
            : `${[
                rootCssSelector,
                ...nonScreenGlobalVariants.map((variant) =>
                  nonScreenGlobalVariantCssSelector([variant])
                ),
              ].join(", ")}`;

        return `
        ${
          hasScreenVariant(activeGlobalVariants)
            ? `@media ${
                ensure(
                  activeGlobalVariants.find((v) => isScreenVariant(v)),
                  () => "Couldn't find screen variant"
                ).mediaQuery
              } {`
            : ""
        }
        ${selector} {
          ${groupedMixinVars[key]
            .flatMap((t) =>
              opts?.generateExternalCssVar
                ? [t.varRule, t.externalVarRule]
                : [t.varRule]
            )
            .join("; ")}
        }
        ${hasScreenVariant(activeGlobalVariants) ? "}" : ""}`;
      }),
  ].join("\n");
};

const genTokenVarRuleWithVariants = (
  token: StyleToken,
  vsh: VariantedStylesHelper = new VariantedStylesHelper()
) => ({
  varRule: `${getTokenVarName(token)}: ${vsh.getActiveTokenValue(token)}`,
  plasmicExternalVarRule: `${getPlasmicExternalTokenVarName(
    token
  )}: ${mkTokenRef(token)}`,
  userExternalVarRule:
    isTokenNameValidCssVariable(token) && `${token.name}: ${mkTokenRef(token)}`,
  vsh,
});

export const makeCssTokenVarsRules = (
  site: Site,
  tokens: StyleToken[],
  rootCssSelector: string,
  opts: {
    targetEnv: TargetEnv;
    generateExternalToken?: boolean;
    prefixClassName?: string;
  }
) => {
  const tokenVars = tokens.flatMap((t) => [
    genTokenVarRuleWithVariants(t),
    ...t.variantedValues.map((v) =>
      genTokenVarRuleWithVariants(
        t,
        new VariantedStylesHelper(site, v.variants)
      )
    ),
  ]);

  const groupedTokenVars = L.groupBy(tokenVars, (el) => el.vsh.key());

  const sorter = makeGlobalVariantComboSorter(site);

  return [
    ...L.keys(groupedTokenVars)
      .sort((a, b) => {
        const vshA = groupedTokenVars[a][0].vsh;
        const vshB = groupedTokenVars[b][0].vsh;

        return sorter(vshA.globalVariants() ?? []) <
          sorter(vshB.globalVariants() ?? [])
          ? -1
          : 1;
      })
      .map((key) => {
        const vsh = groupedTokenVars[key][0].vsh;

        const globalVariants = vsh.globalVariants() ?? [];
        const nonScreenGlobalVariants = globalVariants.filter(
          (v) => !isScreenVariant(v)
        );

        return `
        ${
          hasScreenVariant(globalVariants)
            ? `@media ${
                ensure(
                  globalVariants.find((v) => isScreenVariant(v)),
                  () => "Couldn't find screen variant"
                ).mediaQuery
              } {`
            : ""
        }
        ${rootCssSelector}${
          nonScreenGlobalVariants.length > 0
            ? `:where(.${makeCssClassNameForVariantCombo(
                nonScreenGlobalVariants,
                {
                  targetEnv: opts.targetEnv,
                  prefix: opts?.prefixClassName,
                }
              )})`
            : ""
        } {
          ${groupedTokenVars[key]
            .flatMap((t) => [
              t.varRule,
              t.plasmicExternalVarRule,
              ...(t.userExternalVarRule ? [t.userExternalVarRule] : []),
            ])
            .join("; ")}
        }
        ${hasScreenVariant(globalVariants) ? "}" : ""}`;
      }),
  ].join("\n");
};

export const mkCssVarsRuleForCanvas = (
  site: Site,
  tokens: StyleToken[],
  mixins: Mixin[],
  themes: Theme[],
  assets: ImageAsset[],
  activeTheme: Theme | null | undefined
) => {
  const rootSelector = `.plasmic-tokens`;
  const tokenVarsRules = makeCssTokenVarsRules(
    site,
    tokens,
    // We use plasmic-tokens instead of rootSelector, same as in codegen,
    // because it is important for all variants of token values to also be
    // defined in .plasmic-tokens, instead of another descendant element. Else,
    // suppose we have token A, and token B references token A, and token A
    // changes value for theme1. If the DOM looks like:
    //   .__wab_user-body
    //     .theme1
    //        ...
    // then under theme1, the value of token A has changed. But what's the value
    // of token B? Token B is defined at .__wab_user-body, where the value of
    // token A is still the old value!
    // So instead, we need to have .__wab_user-body and .__wab_user-body.theme1
    // be at the same DOM element. Hence instead of using .__wab_user-body,
    // we use .plasmic-tokens, which is applied to all component roots.
    rootSelector,
    {
      targetEnv: "canvas",
      prefixClassName: "__wab_",
      generateExternalToken: true,
    }
  );
  const mixinVarsRules = makeMixinVarsRules(
    site,
    [
      ...mixins,
      ...themes.map((t) => t.defaultStyle),
      ...L.flatMap(themes, (t) => t.styles.map((s) => s.style)),
    ],
    rootSelector,
    {
      targetEnv: "canvas",
      prefixClassName: "__wab_",
      generateExternalCssVar: true,
    }
  );
  // Set the theme if there is an active one.
  const themeVars = activeTheme
    ? themeableProps.map((prop) => {
        const activeThemeValue = getMixinPropVarName(
          activeTheme.defaultStyle,
          prop,
          false
        );
        return `${getThemePropVarName(prop)}: var(${activeThemeValue})`;
      })
    : [];

  const imageVars = assets.map((asset) => {
    let url = "";
    if (asset.dataUri) {
      url = imageBlobUrl.get(asset.dataUri) || "";
      if (!url) {
        url =
          asset.dataUri?.indexOf("data:") === 0
            ? URL.createObjectURL(imageDataUriToBlob(asset.dataUri))
            : asset.dataUri;

        imageBlobUrl.set(asset.dataUri, url);
      }
    }
    return `${getImageAssetVarName(asset)}: url("${url || ""}")`;
  });

  const nonScreenGlobalVariants = site.globalVariantGroups.flatMap(
    (variantGroup) => variantGroup.variants.filter((v) => !isScreenVariant(v))
  );

  const selector = [
    rootSelector,
    ...nonScreenGlobalVariants.map(
      (variant) =>
        `${rootSelector}:where(.${makeCssClassNameForVariantCombo([variant], {
          targetEnv: "canvas",
          prefix: "__wab_",
        })})`
    ),
  ].join(", ");

  // Apply theme styles in `.__wab_expr_html_text <selector>` to target elements
  // inside rich ExprText.
  const textDefaultTagStyles = (activeTheme?.styles || []).map((style) => {
    const mixin = style.style;
    const m = new Map<string, string>();
    Object.entries(makeLayoutAwareRuleSet(mixin.rs, false).values).forEach(
      ([rule, val]) => {
        m.set(rule, val);
      }
    );

    addFontFamilyFallback(m);

    return `:where(.${makeWabHtmlTextClassName({ targetEnv: "canvas" })} ${
      style.selector
    }) { ${showStyles(m)} }`;
  });

  const varResolver = new CanvasVarResolver(site);
  const rootResetRules = [
    site,
    ...walkDependencyTree(site, "all").map((dep) => dep.site),
  ].flatMap((s) => {
    const resetName = makeRootResetClassName(`${s.uid}`, {
      targetEnv: "canvas",
      useCssModules: false,
    });
    return [
      mkComponentRootResetRule(s, resetName),
      ...(s.activeTheme?.styles ?? []).map((ts) =>
        mkThemeStyleRule(resetName, varResolver, ts, {
          classNameBase: studioDefaultStylesClassNameBase,
          useCssModules: false,
          targetEnv: "canvas",
        })
      ),
    ];
  });

  return [
    tokenVarsRules,
    makeLayoutVarsRules(site, rootSelector),
    mixinVarsRules,
    `${selector} { ${[...themeVars, ...imageVars].join(";")} }`,
    textDefaultTagStyles.join("\n"),
    ...rootResetRules,
  ].join("\n");
};

export function makeLayoutVarsRules(site: Site, selector: string) {
  if (isHostLessPackage(site) || !site.activeTheme) {
    // Don't pollute --plsmc-* with default token values from hostless
    return "";
  }
  const isOwned = site.themes.includes(site.activeTheme);
  if (!isOwned && !site.activeTheme.layout) {
    // If using someone else's theme, then we don't want to pollute
    // `.selector` with default --plsmc-* token values
    return "";
  }
  const layoutRs = site.activeTheme.layout?.rs;
  const layoutRsh = layoutRs ? new RuleSetHelpers(layoutRs, "div") : undefined;
  const getProp = (prop: string) => {
    return layoutRsh?.getRaw(prop) ?? CONTENT_LAYOUT_DEFAULTS[prop];
  };
  return `
  ${selector} {
    --plsmc-standard-width: ${getProp(CONTENT_LAYOUT_STANDARD_WIDTH_PROP)};
    --plsmc-wide-width: ${getProp(CONTENT_LAYOUT_WIDE_WIDTH_PROP)};
    --plsmc-viewport-gap: ${getProp(CONTENT_LAYOUT_VIEWPORT_GAP_PROP)};
    --plsmc-wide-chunk: calc(((var(--plsmc-wide-width) - var(--plsmc-standard-width)) / 2) - var(--plsmc-viewport-gap));
  }
    `;
}

export function makeCanvasRuleNamers(component: Component) {
  const classNamer = (tpl: TplNode, vs: VariantSetting) =>
    classNameForRuleSet(vs.rs);
  const baseRuleNamer = makeBaseRuleNamer(classNamer);
  return {
    interactive: makePseudoElementAwareRuleNamer(
      makePseudoClassAwareRuleNamer(component, baseRuleNamer)
    ),
    nonInteractive: makePseudoElementAwareRuleNamer(baseRuleNamer),
  };
}

export function genCanvasRules(
  ctx: ComponentGenHelper,
  tpl: TplNode,
  vs: VariantSetting
) {
  const site = ctx.site;
  const component = ctx.owningComponent(tpl);
  if (!component) {
    // If there's still no owning component, that's only acceptable if the tpl is a
    // TplComponent of an ArenaFrame root, because then there's no "containing"
    // Component.  That means the TplComponent should only have a single vsetting
    // which is the globalVariant.
    assert(
      isTplComponent(tpl) &&
        tpl.vsettings.length <= 1 &&
        L.isEqual(vs.variants, [site.globalVariant]),
      () => `No owner component found for non-arena-root tpl`
    );
  }

  const ruleNamers = makeCanvasRuleNamers(
    component ?? ensureKnownTplComponent(tpl).component
  );
  const nonInteractiveRuleSet = showSimpleCssRuleSet(
    ctx,
    tpl,
    vs,
    ruleNamers.nonInteractive,
    {
      targetEnv: "canvas",
      useCssModules: false,
      onlyInteractiveCanvasPseudoClasses: false,
    }
  );
  const interactiveRuleSet = showSimpleCssRuleSet(
    ctx,
    tpl,
    vs,
    ruleNamers.interactive,
    {
      targetEnv: "canvas",
      useCssModules: false,
      // We will generate the interactive pseudo classes but they only can be activated if the
      // canvas is in interactive mode
      onlyInteractiveCanvasPseudoClasses: true,
    }
  );
  return [...nonInteractiveRuleSet, ...interactiveRuleSet];
}

export const cloneRuleSet = (rs: RuleSet) => {
  return new RuleSet({
    values: { ...rs.values },
    mixins: [...rs.mixins],
  });
};

export function mkRuleSet(
  obj: {
    values?: Record<string, string>;
  } = {}
) {
  return new RuleSet({
    values: obj.values ?? {},
    mixins: [],
  });
}

export function mkSelectorRuleSet(opts: {
  isBase: boolean;
  selector: string | undefined | null;
}) {
  return new SelectorRuleSet({
    selector: opts.selector,
    rs: mkRuleSet(),
  });
}

export function px(x: number) {
  return `${x}px`;
}

export function createRuleSetMerger(
  rulesets: DeepReadonlyArray<RuleSet>,
  tpl: TplNode
) {
  if (rulesets.length === 1) {
    return readonlyRSH(rulesets[0], tpl);
  } else {
    return new RuleSetMerger(rulesets, tpl);
  }
}

export class RuleSetMerger {
  constructor(
    private rulesets: DeepReadonlyArray<RuleSet>,
    private tplTag: TplNode
  ) {}

  has(prop: string): boolean {
    return this.rulesets.some((rs) => readonlyRSH(rs, this.tplTag).has(prop));
  }

  get(prop: string): string {
    const val = this.getRaw(prop);
    if (val === undefined) {
      return RSH(mkRuleSet(), this.tplTag).get(prop);
    } else {
      return val;
    }
  }

  getRaw(prop: string): string | undefined {
    for (const rs of this.rulesets.slice().reverse()) {
      const exp = readonlyRSH(rs, this.tplTag);
      if (exp.has(prop)) {
        return exp.getRaw(prop);
      }
    }
    return undefined;
  }

  getAll(prop: string): string[] {
    return this.rulesets.map((rs) => readonlyRSH(rs, this.tplTag).get(prop));
  }

  props() {
    return L.uniq(
      L.flatten(this.rulesets.map((rs) => getAllDefinedStyles(rs)))
    );
  }
}

/**
 * Returns the RuleSets, including from mixins.  The rulesets are returned
 * in the same order as the array, with the mixin rulesets returned
 * before the owning RuleSet
 */
export function expandRuleSets(
  rulesets: DeepReadonlyArray<RuleSet>
): DeepReadonlyArray<RuleSet> {
  // Fast return case for when there's just a single RuleSet without
  // mixins applied
  if (rulesets.length === 0) {
    return [];
  }
  if (rulesets.length === 1 && rulesets[0].mixins.length === 0) {
    return rulesets;
  }
  return rulesets.flatMap((rs) => [
    ...expandRuleSets(rs.mixins.map((m) => m.rs)),
    rs,
  ]);
}

/**
 * Creates a RuleSetMerger from the argument RuleSet, including all
 * referenced mixins
 */
export function createExpandedRuleSetMerger(
  rs: DeepReadonly<RuleSet>,
  tpl: TplNode
) {
  return createRuleSetMerger(expandRuleSets([rs]), tpl);
}

export function cloneVariantedValue(variantedValue: VariantedValue) {
  return new VariantedValue({
    variants: variantedValue.variants,
    value: variantedValue.value,
  });
}

export function cloneVariantedRs(variantedRs: VariantedRuleSet) {
  return new VariantedRuleSet({
    variants: variantedRs.variants,
    rs: cloneRuleSet(variantedRs.rs),
  });
}

export function cloneStyleToken(token: StyleToken) {
  return new StyleToken({
    name: token.name,
    regKey: token.regKey,
    value: token.value,
    type: token.type,
    uuid: mkShortId(),
    variantedValues: token.variantedValues.map(cloneVariantedValue),
    isRegistered: token.isRegistered,
  });
}

export function cloneMixin(mixin: Mixin) {
  return new Mixin({
    name: mixin.name,
    forTheme: mixin.forTheme,
    uuid: mkShortId(),
    preview: mixin.preview,
    rs: cloneRuleSet(mixin.rs),
    variantedRs: mixin.variantedRs.map(cloneVariantedRs),
  });
}

export function cloneThemeStyle(style: ThemeStyle) {
  return new ThemeStyle({
    selector: style.selector,
    style: cloneMixin(style.style),
  });
}

export function cloneTheme(theme: Theme) {
  return new Theme({
    defaultStyle: cloneMixin(theme.defaultStyle),
    active: theme.active,
    styles: theme.styles.map((s) => cloneThemeStyle(s)),
    layout: theme.layout ? cloneThemeLayoutSettings(theme.layout) : null,
    addItemPrefs: Object.fromEntries(
      Object.entries(theme.addItemPrefs).map(([key, rs]) => [
        key,
        cloneRuleSet(rs),
      ])
    ),
  });
}

export function cloneThemeLayoutSettings(layout: ThemeLayoutSettings) {
  return new ThemeLayoutSettings({
    rs: cloneRuleSet(layout.rs),
  });
}

interface TokenUsageBase {}

interface TokenUsageByRule extends TokenUsageBase {
  value: string;
  prop: string;
  rs: RuleSet;
  type: "rule";
}

interface TokenUsageByToken extends TokenUsageBase {
  token: StyleToken;
  type: "token";
}

interface TokenUsageByVariantedValue extends TokenUsageBase {
  variantedValue: VariantedValue;
  type: "variantedValue";
}

interface TokenUsageByComponentProp extends TokenUsageBase {
  tpl: TplComponent;
  vs: VariantSetting;
  arg: Arg;
  type: "prop";
}

interface TokenUsageByComponentPropFallback extends TokenUsageBase {
  tpl: TplComponent;
  vs: VariantSetting;
  expr: FallbackableExpr;
  type: "fallback";
}

type TokenUsage =
  | TokenUsageByRule
  | TokenUsageByToken
  | TokenUsageByVariantedValue
  | TokenUsageByComponentProp
  | TokenUsageByComponentPropFallback;

export interface DefaultStyle {
  style: Mixin;
  selector?: string;
}

export function changeTokenUsage(
  site: Site,
  token: StyleToken,
  usage: TokenUsage,
  action: "inline" | "reset" | StyleToken
) {
  const replaced = isKnownStyleToken(action)
    ? mkTokenRef(action)
    : action === "inline"
    ? token.value
    : tokenTypeDefaults(token.type as TokenType);
  if (usage.type === "rule") {
    usage.rs.values[usage.prop] = replaceAllTokenRefs(
      usage.value,
      (tokenId: string) => (tokenId === token.uuid ? replaced : undefined)
    );
  } else if (usage.type === "token") {
    usage.token.value = replaced;
  } else if (usage.type === "variantedValue") {
    usage.variantedValue.value =
      action === "inline"
        ? new VariantedStylesHelper(
            site,
            usage.variantedValue.variants
          ).getActiveTokenValue(token)
        : replaced;
  } else if (usage.type === "prop") {
    usage.arg.expr = codeLit(replaced);
  } else if (usage.type === "fallback") {
    usage.expr.fallback = codeLit(replaced);
  } else {
    unreachable(usage);
  }
}

export interface TokenUsageSummary {
  components: Component[];
  frames: ArenaFrame[];
  mixins: Mixin[];
  tokens: StyleToken[];
  themes: DefaultStyle[];
  addItemPrefs: AddItemKey[];
}

export function extractTokenUsages(
  site: Site,
  token: StyleToken
): [Set<TokenUsage>, TokenUsageSummary] {
  const usages = new Set<TokenUsage>();
  const usingComponents = new Set<Component>();
  const usingMixins = new Set<Mixin>();
  const usingThemes = new Set<DefaultStyle>();
  const usingAddItemPrefs = new Set<AddItemKey>();
  const usingTokens = new Set<StyleToken>();
  const traverseTpl = (tplRoot: TplNode, component: Component) => {
    const trackComponent = () => {
      usingComponents.add(component);
    };

    for (const [vs, tpl] of findVariantSettingsUnderTpl(tplRoot)) {
      const exp = createExpandedRuleSetMerger(vs.rs, tpl);
      for (const prop of exp.props()) {
        const value = exp.getRaw(prop) || undefined;
        if (value) {
          const allTokenRefs = extractAllReferencedTokenIds(value);
          if (allTokenRefs.includes(token.uuid)) {
            usages.add({ value, type: "rule", prop, rs: vs.rs });
            trackComponent();
          }
        }
      }
      if (isTplComponent(tpl)) {
        for (const arg of vs.args) {
          if (isKnownStyleTokenRef(arg.expr) && arg.expr.token === token) {
            trackComponent();
            usages.add({ type: "prop", tpl, vs, arg });
          } else if (isFallbackableExpr(arg.expr)) {
            const fallback = arg.expr.fallback;
            if (isKnownStyleTokenRef(fallback) && fallback.token === token) {
              trackComponent();
              usages.add({ type: "fallback", tpl, vs, expr: arg.expr });
            }
          }
        }
      }
    }
  };

  for (const component of site.components) {
    traverseTpl(component.tplTree, component);
  }

  const arenaFrames = site.arenas.flatMap((arena) => getArenaFrames(arena));

  const usingFrames = [...usingComponents].filter(isFrameComponent).map((c) =>
    ensure(
      arenaFrames.find((frame) => frame.container.component === c),
      () => `Couldn't find arenaFrame for component ${c.name} (${c.uuid})`
    )
  );

  const findUsagesInRs = (rs: RuleSet) => {
    let used = false;
    for (const [rule, value] of Object.entries(rs.values)) {
      if (extractAllReferencedTokenIds(value).includes(token.uuid)) {
        usages.add({ value, type: "rule", rs, prop: rule });
        used = true;
      }
    }
    return used;
  };
  for (const mixin of site.mixins) {
    if (findUsagesInRs(mixin.rs)) {
      usingMixins.add(mixin);
    }
  }
  for (const theme of site.themes) {
    if (findUsagesInRs(theme.defaultStyle.rs)) {
      usingThemes.add({
        style: theme.defaultStyle,
      });
    }
    for (const style of theme.styles) {
      if (findUsagesInRs(style.style.rs)) {
        usingThemes.add({
          style: style.style,
          selector: style.selector,
        });
      }
    }
    for (const [key, rs] of Object.entries(theme.addItemPrefs)) {
      if (findUsagesInRs(rs)) {
        usingAddItemPrefs.add(key as AddItemKey);
      }
    }
  }
  for (const t of site.styleTokens) {
    if (extractAllReferencedTokenIds(t.value).includes(token.uuid)) {
      usages.add({ token: t, type: "token" });
      usingTokens.add(t);
    }

    for (const variantedValue of t.variantedValues) {
      if (
        extractAllReferencedTokenIds(variantedValue.value).includes(token.uuid)
      ) {
        usages.add({ variantedValue, type: "variantedValue" });
        usingTokens.add(t);
      }
    }
  }
  return tuple(usages, {
    components: [...usingComponents].filter((c) => !isFrameComponent(c)),
    mixins: [...usingMixins],
    tokens: [...usingTokens],
    themes: [...usingThemes],
    frames: usingFrames,
    addItemPrefs: [...usingAddItemPrefs],
  });
}

export function extractMixinUsages(
  site: Site,
  mixin: Mixin
): [Set<RuleSet>, GeneralUsageSummary] {
  const usages = new Set<RuleSet>();
  const usingComponents = new Set<Component>();

  const traverseTpl = (tplRoot: TplNode, component: Component) => {
    for (const [vs, _tpl] of findVariantSettingsUnderTpl(tplRoot)) {
      if (vs.rs.mixins.find((m) => m === mixin)) {
        usages.add(vs.rs);
        usingComponents.add(component);
      }
    }
  };

  for (const component of site.components) {
    traverseTpl(component.tplTree, component);
  }

  const arenaFrames = site.arenas.flatMap((arena) => getArenaFrames(arena));

  const usingFrames = [...usingComponents].filter(isFrameComponent).map((c) =>
    ensure(
      arenaFrames.find((frame) => frame.container.component === c),
      () => `Couldn't find arenaFrame for component ${c.name} (${c.uuid})`
    )
  );

  return tuple(usages, {
    components: [...usingComponents].filter((c) => !isFrameComponent(c)),
    frames: [...usingFrames],
  });
}

export const maybeTokenRefCycle = (
  token: StyleToken,
  tokens: StyleToken[],
  newValue: string,
  vsh?: VariantedStylesHelper
) => {
  const visited = new Set<StyleToken>([token]);
  let curValue = newValue;
  vsh = vsh ?? new VariantedStylesHelper();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const referredToken = tryParseTokenRef(curValue, tokens);
    if (!referredToken) {
      return undefined;
    }
    if (visited.has(referredToken)) {
      // It must be the case the the cycle end up referring token itself;
      // otherwise, we would have detected the cycle beforehand.
      assert(
        referredToken === token,
        () =>
          `token ${token.name} (${token.uuid}) is cyclically referencing ${referredToken.name} (${referredToken.uuid})`
      );
      const cycle = [...visited].map((t) => t.name);
      cycle.push(referredToken.name);
      return cycle;
    }
    visited.add(referredToken);
    curValue = vsh.getActiveTokenValue(referredToken);
  }
};

export function extendFontFamilyWithFallbacks(fonts: string[]) {
  const unquotedFonts = fonts.map((f) => unquote(f));
  const family = unquotedFonts[0];
  const googFontMeta = getGoogFontMeta(family);
  if (googFontMeta) {
    // TODO: Add some nicer fallback fonts?
    if (googFontMeta.category === "serif") {
      return css.showCssValues("font-family", [...unquotedFonts, "serif"]);
    } else if (googFontMeta.category === "sans-serif") {
      return css.showCssValues("font-family", [...unquotedFonts, "sans-serif"]);
    }
  }
  return css.showCssValues("font-family", unquotedFonts);
}

export function cssPropsToRuleSet(props: CSSProperties) {
  return mkRuleSet({
    values: Object.fromEntries(
      Object.entries(props).map(([name, value]) => [normProp(name), "" + value])
    ),
  });
}

export function deriveBackgroundStyles(
  stylesMap: Map<string, string>,
  backgroundCssValue: string
) {
  const vals: string[] = splitCssValue("background", backgroundCssValue);
  const lastLayer: BackgroundLayer = cssPegParser.parse(vals[vals.length - 1], {
    startRule: "backgroundLayer",
  });
  ensureInstance(lastLayer, BackgroundLayer);
  // If last layer is ColorFill, turn it into background-color.
  lastLayer.preferBackgroundColorOverColorFill = true;
  vals[vals.length - 1] = lastLayer.showCss();
  stylesMap.set("background", css.showCssValues("background", vals));

  if (vals.some((val) => val.includes(bgClipTextTag))) {
    const layers: BackgroundLayer[] = [
      ...vals
        // Avoid parsing lastLayer again (especially because vals[length - 1])
        // might have been modified due to preferBackgroundColorOverColorFill
        // and not be recognized by our parser
        .slice(0, vals.length - 1)
        .map((v) => cssPegParser.parse(v, { startRule: "backgroundLayer" })),
      lastLayer,
    ];
    // "background-clip: text" must be set globally, separated and after
    // the background shorthand.
    const clipValues = layers
      .map((l) =>
        l.clip === bgClipTextTag
          ? "text"
          : l.clip || css.getCssInitial("background-clip", "div")
      )
      .join(", ");
    stylesMap.set("background-clip", clipValues);
    stylesMap.set("-webkit-background-clip", clipValues);
  }
}

const DEFAULT_STYLES_CODE_COMPONENT_STYLE_PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "color",
  "letter-spacing",
];
/**
 * Returns default style values to be used for `themeStyles`
 * component prop type.
 *
 * Note that this is only returning the base values!
 */
export function makeDefaultStyleValuesDict(
  site: Site,
  activeGlobalVariants: Variant[]
) {
  const theme = site.activeTheme;
  if (!theme) {
    return {};
  }
  const vsh = new VariantedStylesHelper(site, activeGlobalVariants);
  const mergedRs = vsh.getActiveVariantedRuleSet(theme.defaultStyle);
  const exp = new RuleSetHelpers(mergedRs, "div");
  const resolver = makeTokenRefResolver(site);
  return Object.fromEntries(
    DEFAULT_STYLES_CODE_COMPONENT_STYLE_PROPS.map((prop) => {
      const value = exp.get(prop);
      const resolved = resolver(value, vsh);
      return [camelCase(prop), resolved ?? value];
    })
  );
}

export function getRelevantVariantCombosForToken(
  site: Site,
  token: StyleToken
) {
  const addCombo = (combo: VariantCombo) =>
    map.set(variantComboKey(combo), combo);
  const map = new Map<string, VariantCombo>();

  const allTokens = siteToAllTokensDict(site);

  const traverseToken = (t: StyleToken) => {
    for (const vv of t.variantedValues) {
      addCombo(vv.variants);
      const maybeToken = tryParseTokenRef(vv.value, allTokens);
      if (maybeToken) {
        traverseToken(maybeToken);
      }
    }
  };

  traverseToken(token);
  return Array.from(map.values());
}

export function getRelevantVariantCombosForTheme(site: Site) {
  if (!site.activeTheme) {
    return [];
  }
  const addCombo = (combo: VariantCombo) =>
    map.set(variantComboKey(combo), combo);
  const map = new Map<string, VariantCombo>();

  const allTokens = siteToAllTokensDict(site);
  const checkValue = (value: string) => {
    const maybeToken = tryParseTokenRef(value, allTokens);
    if (maybeToken) {
      getRelevantVariantCombosForToken(site, maybeToken).forEach((combo) =>
        addCombo(combo)
      );
    }
  };

  const defaultExp = new RuleSetHelpers(
    site.activeTheme.defaultStyle.rs,
    "div"
  );
  for (const prop of DEFAULT_STYLES_CODE_COMPONENT_STYLE_PROPS) {
    checkValue(defaultExp.get(prop));
  }

  for (const vrs of site.activeTheme.defaultStyle.variantedRs) {
    addCombo(vrs.variants);
    const exp = new RuleSetHelpers(vrs.rs, "div");
    for (const prop of DEFAULT_STYLES_CODE_COMPONENT_STYLE_PROPS) {
      checkValue(exp.get(prop));
    }
  }
  return Array.from(map.values());
}
