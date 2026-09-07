import { derefTokenRefs, isTokenRef } from "@/wab/commons/StyleToken";
import { isPageComponent } from "@/wab/shared/core/components";
import {
  siteFinalStyleTokensAllDeps,
  siteFinalStyleTokensDirectDeps,
} from "@/wab/shared/core/site-style-tokens";
import { allGlobalVariantGroups } from "@/wab/shared/core/sites";
import { generateKeyframesRule } from "@/wab/shared/core/styles";
import { getSelectableThemes } from "@/wab/shared/core/theme-styles";
import { BASE_THEMABLE_TAG } from "@/wab/shared/html";
import { FinalToken, toFinalToken } from "@/wab/shared/core/tokens";
import { parseScreenSpec } from "@/wab/shared/css-size";
import {
  AnimationSequence,
  Component,
  Mixin,
  Site,
  StyleToken,
  StyleTokenOverride,
  Theme,
} from "@/wab/shared/model/classes";
import { getStylesFromRuleSet } from "@/wab/shared/web-exporter/component-exporter";
import {
  type AnimationJson,
  type AnimationSummaryJson,
  type ComponentSummaryJson,
  type DataQueryFunctionsJson,
  type GlobalVariantGroupJson,
  type MixinJson,
  type ProjectJson,
  type ScreenBreakpointJson,
  type ThemeJson,
  type ThemeStyleJson,
  type TokenJson,
  type TokenValuesJson,
  type VariantedStyleJson,
  type VariantedValueJson,
} from "@/wab/shared/web-exporter/schema";

/**
 * Build the canonical JSON model for project-level information. Produces a
 * flattened view: each requested key lists the project's own resources plus
 * those of every imported (direct dependency) project; imported resources carry
 * a `fromProject` id.
 *
 * `customFunctions` is pre-built by the caller, since it requires StudioCtx.
 */
export function buildProjectResource(
  site: Site,
  customFunctions: DataQueryFunctionsJson | undefined,
  opts: {
    projectId: string;
    components?: boolean;
    screenBreakpoints?: boolean;
    globalVariants?: boolean;
    tokens?: boolean;
    mixins?: boolean;
    animations?: boolean;
    themes?: "active" | "all";
  }
): ProjectJson {
  let components: ComponentSummaryJson[] | undefined;
  if (opts.components) {
    const toComponentSummary = (
      comp: Component,
      fromProject?: string
    ): ComponentSummaryJson => {
      const path =
        isPageComponent(comp) && comp.pageMeta.path
          ? comp.pageMeta.path
          : undefined;
      return {
        __type: "Component",
        name: comp.name,
        uuid: comp.uuid,
        type: comp.type,
        ...(path ? { pageMeta: { __type: "PageMeta", path } } : {}),
        ...(fromProject ? { fromProject } : {}),
      };
    };
    components = [
      ...site.components.map((comp) => toComponentSummary(comp)),
      ...site.projectDependencies.flatMap((dep) =>
        dep.site.components.map((comp) =>
          toComponentSummary(comp, dep.projectId)
        )
      ),
    ];
  }

  let screenBreakpoints: ScreenBreakpointJson[] | undefined;
  const screenGroup = site.activeScreenVariantGroup;
  if (opts.screenBreakpoints && screenGroup) {
    screenBreakpoints = screenGroup.variants.map((variant) => {
      const breakpoint: ScreenBreakpointJson = {
        __type: "ScreenBreakpoint",
        name: variant.name,
        uuid: variant.uuid,
      };
      if (variant.mediaQuery) {
        const spec = parseScreenSpec(variant.mediaQuery);
        if (spec.minWidth) {
          breakpoint.minWidth = spec.minWidth;
        }
        if (spec.maxWidth) {
          breakpoint.maxWidth = spec.maxWidth;
        }
      }
      return breakpoint;
    });
  }

  let globalVariantGroups: GlobalVariantGroupJson[] | undefined;
  if (opts.globalVariants) {
    const groupToDepProjectId = new Map(
      site.projectDependencies.flatMap((dep) =>
        dep.site.globalVariantGroups.map(
          (group) => [group, dep.projectId] as const
        )
      )
    );
    globalVariantGroups = allGlobalVariantGroups(site, {
      includeDeps: "direct",
      excludeInactiveScreenVariants: true,
    }).map((group): GlobalVariantGroupJson => {
      const fromProject = groupToDepProjectId.get(group);
      return {
        __type: "GlobalVariantGroup",
        name: group.param.variable.name,
        uuid: group.uuid,
        ...(fromProject ? { fromProject } : {}),
        variants: group.variants.map((variant) => ({
          __type: "Variant",
          name: variant.name,
          uuid: variant.uuid,
        })),
      };
    });
  }

  let tokens: TokenJson[] | undefined;
  if (opts.tokens) {
    const allFinalTokens = siteFinalStyleTokensAllDeps(site);
    const tokenToDepProjectId = new Map(
      site.projectDependencies.flatMap((dep) =>
        dep.site.styleTokens.map((token) => [token, dep.projectId] as const)
      )
    );
    tokens = siteFinalStyleTokensDirectDeps(site).map((finalToken) =>
      buildTokenModel(finalToken.base, allFinalTokens, {
        override: finalToken.override,
        fromProject: tokenToDepProjectId.get(finalToken.base),
      })
    );
  }

  let mixins: MixinJson[] | undefined;
  if (opts.mixins) {
    mixins = [
      ...site.mixins.map((mixin) => buildMixinResource(mixin)),
      ...site.projectDependencies.flatMap((dep) =>
        dep.site.mixins.map((mixin) =>
          buildMixinResource(mixin, { fromProject: dep.projectId })
        )
      ),
    ];
  }

  let animations: AnimationSummaryJson[] | undefined;
  if (opts.animations) {
    const toAnimationSummary = (
      sequence: AnimationSequence,
      fromProject?: string
    ): AnimationSummaryJson => ({
      __type: "Animation",
      name: sequence.name,
      uuid: sequence.uuid,
      ...(fromProject ? { fromProject } : {}),
    });
    animations = [
      ...site.animationSequences.map((seq) => toAnimationSummary(seq)),
      ...site.projectDependencies.flatMap((dep) =>
        dep.site.animationSequences.map((seq) =>
          toAnimationSummary(seq, dep.projectId)
        )
      ),
    ];
  }

  let themes: ThemeJson[] | undefined;
  if (opts.themes) {
    const selectable = getSelectableThemes(site);
    const included =
      opts.themes === "all"
        ? [...selectable]
        : selectable.filter((st) => st.theme === site.activeTheme);
    // Legacy projects can have an active theme in neither site.themes nor a
    // dependency.
    if (
      site.activeTheme &&
      !included.some((st) => st.theme === site.activeTheme)
    ) {
      included.push({ theme: site.activeTheme });
    }
    themes = included.map(({ theme, fromProject }) =>
      buildThemeResource(theme, {
        active: theme === site.activeTheme,
        fromProject,
      })
    );
  }

  return {
    __type: "Project",
    id: opts.projectId,
    ...(components ? { components } : {}),
    ...(screenBreakpoints ? { screenBreakpoints } : {}),
    ...(globalVariantGroups ? { globalVariantGroups } : {}),
    ...(tokens ? { tokens } : {}),
    ...(mixins ? { mixins } : {}),
    ...(animations ? { animations } : {}),
    ...(themes ? { themes } : {}),
    ...(customFunctions ? { dataQueryFunctions: customFunctions } : {}),
    importedProjects: site.projectDependencies.map((dep) => ({
      __type: "ImportedProject",
      id: dep.projectId,
      name: dep.name,
    })),
  };
}

export function buildThemeResource(
  theme: Theme,
  opts: { active?: boolean; fromProject?: string } = {}
): ThemeJson {
  const toThemeStyleModel = (
    selector: string,
    mixin: Mixin
  ): ThemeStyleJson => {
    const variantedStyles = buildVariantedStylesModel(mixin);
    return {
      __type: "ThemeStyle",
      selector,
      styles: getStylesFromRuleSet(mixin.rs),
      ...(variantedStyles.length > 0 ? { variantedStyles } : {}),
    };
  };
  return {
    __type: "Theme",
    uuid: theme.defaultStyle.uuid,
    ...(opts.active ? { active: true } : {}),
    ...(opts.fromProject ? { fromProject: opts.fromProject } : {}),
    styles: [
      toThemeStyleModel(BASE_THEMABLE_TAG, theme.defaultStyle),
      ...theme.styles.map((ts) => toThemeStyleModel(ts.selector, ts.style)),
    ],
  };
}

/** Build the canonical JSON model for a single style token. */
export function buildTokenResource(
  token: StyleToken,
  opts: { site: Site }
): TokenJson {
  const allFinalTokens = siteFinalStyleTokensAllDeps(opts.site);
  const override = toFinalToken(token, opts.site).override;
  return buildTokenModel(token, allFinalTokens, { override });
}

function buildTokenModel(
  token: StyleToken,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>,
  opts: { override?: StyleTokenOverride | null; fromProject?: string } = {}
): TokenJson {
  return {
    __type: "Token",
    name: token.name,
    uuid: token.uuid,
    type: token.type,
    ...(opts.fromProject ? { fromProject: opts.fromProject } : {}),
    value: buildTokenValuesModel(token, allFinalTokens),
    ...(opts.override
      ? {
          override: {
            __type: "TokenOverride" as const,
            value: buildTokenValuesModel(opts.override, allFinalTokens),
          },
        }
      : {}),
  };
}

function buildTokenValuesModel(
  source: StyleToken | StyleTokenOverride,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>
): TokenValuesJson {
  const resolvedValue =
    source.value != null && isTokenRef(source.value)
      ? derefTokenRefs(allFinalTokens, source.value)
      : undefined;
  const variantedValues = buildVariantedValuesModel(source, allFinalTokens);
  return {
    __type: "TokenValues",
    ...(source.value != null ? { value: source.value } : {}),
    ...(resolvedValue != null ? { resolvedValue } : {}),
    ...(variantedValues ? { variantedValues } : {}),
  };
}

function buildVariantedValuesModel(
  token: StyleToken | StyleTokenOverride,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>
): VariantedValueJson[] | undefined {
  if (token.variantedValues.length === 0) {
    return undefined;
  }
  return token.variantedValues.map((vv) => {
    const value: VariantedValueJson = {
      __type: "VariantedValue",
      variantUuids: vv.variants.map((v) => v.uuid),
      value: vv.value,
    };
    if (isTokenRef(vv.value)) {
      value.resolvedValue = derefTokenRefs(allFinalTokens, vv.value);
    }
    return value;
  });
}

export function buildMixinResource(
  mixin: Mixin,
  opts: { fromProject?: string } = {}
): MixinJson {
  const variantedStyles = buildVariantedStylesModel(mixin);
  return {
    __type: "Mixin",
    name: mixin.name,
    uuid: mixin.uuid,
    ...(opts.fromProject ? { fromProject: opts.fromProject } : {}),
    styles: getStylesFromRuleSet(mixin.rs),
    ...(mixin.preview ? { preview: mixin.preview } : {}),
    ...(variantedStyles.length > 0 ? { variantedStyles } : {}),
  };
}

function buildVariantedStylesModel(mixin: Mixin): VariantedStyleJson[] {
  return mixin.variantedRs.map(
    (vRs): VariantedStyleJson => ({
      __type: "VariantedStyle",
      variantUuids: vRs.variants.map((v) => v.uuid),
      styles: getStylesFromRuleSet(vRs.rs),
    })
  );
}

/** Build the canonical JSON model for an animation sequence. */
export function buildAnimationResource(
  sequence: AnimationSequence
): AnimationJson {
  return {
    __type: "Animation",
    name: sequence.name,
    uuid: sequence.uuid,
    keyframesRule: generateKeyframesRule(sequence),
  };
}
