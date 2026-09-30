import {
  getDataTokenType,
  toDataTokenDisplayValue,
} from "@/wab/commons/DataToken";
import { derefTokenRefs, isTokenRef } from "@/wab/commons/StyleToken";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { isScreenVariantGroup } from "@/wab/shared/Variants";
import { makeShortProjectId, toVarName } from "@/wab/shared/codegen/util";
import { withoutUndefinedFields } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import { generateKeyframesRule } from "@/wab/shared/core/styles";
import {
  getSelectableThemes,
  type SelectableTheme,
} from "@/wab/shared/core/theme-styles";
import { FinalToken, toFinalToken } from "@/wab/shared/core/tokens";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { makeDataTokenIdentifier } from "@/wab/shared/eval/expression-parser";
import { BASE_THEMABLE_TAG } from "@/wab/shared/html";
import {
  AnimationSequence,
  Component,
  DataToken,
  Mixin,
  ProjectDependency,
  Site,
  StyleToken,
  StyleTokenOverride,
  Theme,
  VariantGroup,
} from "@/wab/shared/model/classes";
import { getStylesFromRuleSet } from "@/wab/shared/web-exporter/component-exporter";
import {
  type AnimationJson,
  type AnimationSummaryJson,
  type ComponentSummaryJson,
  type DataQueryFunctionsJson,
  type DataTokenJson,
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
 * Build the canonical JSON model for project-level information. Each requested key lists
 * the project's own resources, and each imported (direct dependency) project in
 * `importedProjects` lists its resources under the same keys.
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
    dataTokens?: boolean;
    mixins?: boolean;
    animations?: boolean;
    themes?: "active" | "all";
  },
): ProjectJson {
  const screenBreakpoints = opts.screenBreakpoints
    ? site.activeScreenVariantGroup?.variants.map(
        (variant): ScreenBreakpointJson => {
          const spec = variant.mediaQuery
            ? parseScreenSpec(variant.mediaQuery)
            : undefined;
          return {
            __type: "ScreenBreakpoint",
            name: variant.name,
            uuid: variant.uuid,
            ...(spec?.minWidth ? { minWidth: spec.minWidth } : {}),
            ...(spec?.maxWidth ? { maxWidth: spec.maxWidth } : {}),
          };
        },
      )
    : undefined;

  const allFinalTokens = opts.tokens ? siteFinalStyleTokensAllDeps(site) : [];

  let themes: SelectableTheme[] | undefined;
  if (opts.themes) {
    const selectable = getSelectableThemes(site);
    themes =
      opts.themes === "all"
        ? [...selectable]
        : selectable.filter((st) => st.theme === site.activeTheme);
    // Legacy projects can have an active theme in neither site.themes nor a
    // dependency.
    if (
      site.activeTheme &&
      !themes.some((st) => st.theme === site.activeTheme)
    ) {
      themes.push({ theme: site.activeTheme });
    }
  }

  // Resources owned by `dep`, or by `site` itself when `dep` is omitted. An imported
  // project omits the sections it has nothing in.
  function buildSections(dep?: ProjectDependency) {
    const owner = dep?.site ?? site;
    const list = <T, R>(
      items: readonly T[] | false | undefined,
      build: (item: T) => R,
    ) =>
      items && (!dep || items.length > 0)
        ? items.map((item) => build(item))
        : undefined;
    return withoutUndefinedFields({
      components: list(
        opts.components && owner.components,
        buildComponentSummary,
      ),
      globalVariantGroups: list(
        opts.globalVariants &&
          owner.globalVariantGroups.filter(
            (group) =>
              !isScreenVariantGroup(group) ||
              group === site.activeScreenVariantGroup,
          ),
        buildGlobalVariantGroupSummary,
      ),
      tokens: list(opts.tokens && owner.styleTokens, (token) =>
        buildTokenModel(token, site, allFinalTokens),
      ),
      dataTokens: list(opts.dataTokens && owner.dataTokens, (token) =>
        buildDataTokenResource(token, {
          site: owner,
          projectId: dep?.projectId ?? opts.projectId,
        }),
      ),
      mixins: list(opts.mixins && owner.mixins, buildMixinResource),
      animations: list(
        opts.animations && owner.animationSequences,
        buildAnimationSummary,
      ),
      themes: list(
        themes?.filter((st) => st.fromProject === dep?.projectId),
        ({ theme }) =>
          buildThemeResource(theme, { active: theme === site.activeTheme }),
      ),
    });
  }

  return {
    __type: "Project",
    id: opts.projectId,
    ...(screenBreakpoints ? { screenBreakpoints } : {}),
    ...buildSections(),
    ...(customFunctions ? { dataQueryFunctions: customFunctions } : {}),
    importedProjects: site.projectDependencies.map((dep) => ({
      __type: "ImportedProject",
      id: dep.projectId,
      name: dep.name,
      ...buildSections(dep),
    })),
  };
}

function buildComponentSummary(comp: Component): ComponentSummaryJson {
  const path = isPageComponent(comp) ? comp.pageMeta.path : undefined;
  return {
    __type: "Component",
    name: comp.name,
    uuid: comp.uuid,
    type: comp.type,
    ...(path ? { pageMeta: { __type: "PageMeta", path } } : {}),
  };
}

function buildGlobalVariantGroupSummary(
  group: VariantGroup,
): GlobalVariantGroupJson {
  return {
    __type: "GlobalVariantGroup",
    name: group.param.variable.name,
    uuid: group.uuid,
    variants: group.variants.map((variant) => ({
      __type: "Variant",
      name: variant.name,
      uuid: variant.uuid,
    })),
  };
}

function buildAnimationSummary(
  sequence: AnimationSequence,
): AnimationSummaryJson {
  return { __type: "Animation", name: sequence.name, uuid: sequence.uuid };
}

export function buildThemeResource(
  theme: Theme,
  opts: { active?: boolean; fromProject?: string } = {},
): ThemeJson {
  const toThemeStyleModel = (
    selector: string,
    mixin: Mixin,
  ): ThemeStyleJson => ({
    __type: "ThemeStyle",
    selector,
    ...buildStylesModel(mixin),
  });
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
  opts: { site: Site },
): TokenJson {
  return buildTokenModel(
    token,
    opts.site,
    siteFinalStyleTokensAllDeps(opts.site),
  );
}

function buildTokenModel(
  token: StyleToken,
  site: Site,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>,
): TokenJson {
  const override = toFinalToken(token, site).override;
  return {
    __type: "Token",
    name: token.name,
    uuid: token.uuid,
    type: token.type,
    value: buildTokenValuesModel(token, allFinalTokens),
    ...(override
      ? {
          override: {
            __type: "TokenOverride" as const,
            value: buildTokenValuesModel(override, allFinalTokens),
          },
        }
      : {}),
  };
}

function buildTokenValuesModel(
  source: StyleToken | StyleTokenOverride,
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>,
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
  allFinalTokens: ReadonlyArray<FinalToken<StyleToken>>,
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

/**
 * Build the canonical JSON model for a data token of `site` or one of its direct
 * dependencies. `projectId` is the id of `site`.
 */
export function buildDataTokenResource(
  token: DataToken,
  opts: { site: Site; projectId: string },
): DataTokenJson {
  const dep = opts.site.projectDependencies.find((d) =>
    d.site.dataTokens.includes(token),
  );
  const ownerId = (dep?.projectId ?? opts.projectId) as ProjectId;
  const type = getDataTokenType(token.value);
  return {
    __type: "DataToken",
    name: token.name,
    uuid: token.uuid,
    type,
    value: toDataTokenDisplayValue(token.value, type),
    reference: makeDataTokenIdentifier(
      makeShortProjectId(ownerId),
      toVarName(token.name),
    ),
    ...(dep ? { fromProject: dep.projectId } : {}),
  };
}

export function buildMixinResource(mixin: Mixin): MixinJson {
  return {
    __type: "Mixin",
    name: mixin.name,
    uuid: mixin.uuid,
    ...(mixin.preview ? { preview: mixin.preview } : {}),
    ...buildStylesModel(mixin),
  };
}

function buildStylesModel(mixin: Mixin) {
  const variantedStyles = mixin.variantedRs.map((vRs): VariantedStyleJson => ({
    __type: "VariantedStyle",
    variantUuids: vRs.variants.map((v) => v.uuid),
    styles: getStylesFromRuleSet(vRs.rs),
  }));
  return {
    styles: getStylesFromRuleSet(mixin.rs),
    ...(variantedStyles.length > 0 ? { variantedStyles } : {}),
  };
}

/** Build the canonical JSON model for an animation sequence. */
export function buildAnimationResource(
  sequence: AnimationSequence,
): AnimationJson {
  return {
    __type: "Animation",
    name: sequence.name,
    uuid: sequence.uuid,
    keyframesRule: generateKeyframesRule(sequence),
  };
}
