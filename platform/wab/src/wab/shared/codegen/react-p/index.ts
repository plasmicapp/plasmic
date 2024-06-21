import { arrayReversed } from "@/wab/commons/collections";
import { DeepMap } from "@/wab/commons/deep-map";
import { AppAuthProvider, ProjectId } from "@/wab/shared/ApiSchema";
import {
  allCustomFunctions,
  componentToReferenced,
  customFunctionsAndLibsUsedByComponent,
  makeTokenValueResolver,
} from "@/wab/shared/cached-selectors";
import {
  getBuiltinComponentRegistrations,
  isBuiltinCodeComponent,
} from "@/wab/shared/code-components/builtin-code-components";
import {
  CodeComponentWithHelpers,
  customFunctionId,
  isCodeComponentWithHelpers,
} from "@/wab/shared/code-components/code-components";
import {
  isTplRootWithCodeComponentInteractionVariants,
  withoutInteractionVariantPrefix,
} from "@/wab/shared/code-components/interaction-variants";
import { ComponentGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import {
  extractUsedFontsFromComponents,
  makeCssImports,
} from "@/wab/shared/codegen/fonts";
import {
  makeIconImports,
  makeImportedAssetClassName,
  makePictureImports,
  toReactAttr,
} from "@/wab/shared/codegen/image-assets";
import { reactWebExportedFiles } from "@/wab/shared/codegen/react-p/exported-react-web/files";
import { optimizeGeneratedCodeForHostlessPackages } from "@/wab/shared/codegen/react-p/optimize-hostless-packages";
import { ReactHookSpec } from "@/wab/shared/codegen/react-p/react-hook-spec";
import {
  defaultStyleCssFileName,
  getExportedComponentName,
  getHostNamedImportsForRender,
  getHostNamedImportsForSkeleton,
  getImportedCodeComponentHelperName,
  getImportedComponentName,
  getNormalizedComponentName,
  getPlatformImportComponents,
  getReactWebNamedImportsForRender,
  getSkeletonModuleFileName,
  isPageAwarePlatform,
  makeArgPropsName,
  makeArgsTypeName,
  makeCodeComponentHelperSkeletonIdFileName,
  makeComponentCssIdFileName,
  makeComponentRenderIdFileName,
  makeComponentSkeletonIdFileName,
  makeCssFileName,
  makeCssProjectFileName,
  makeCssProjectIdFileName,
  makeCssProjectImportName,
  makeDefaultExternalPropsName,
  makeDefaultInlineClassName,
  makeDefaultStyleClassNameBase,
  makeDefaultStyleCompWrapperClassName,
  makeDescendantsName,
  makeGlobalContextPropName,
  makeGlobalContextsImport,
  makeGlobalGroupImports,
  makeGlobalVariantsTypeName,
  makeImportedPictureRef,
  makeNodeComponentName,
  makeOverridesTypeName,
  makePictureRefToken,
  makePlasmicComponentName,
  makePlasmicDefaultStylesClassName,
  makePlasmicIsPreviewRootComponent,
  makePlasmicMixinsClassName,
  makePlasmicSuperContextName,
  makePlasmicTokensClassName,
  makePlatformImports,
  makeRenderFuncName,
  makeRootResetClassName,
  makeStylesImports,
  makeTriggerStateTypeName,
  makeUseClient,
  makeVariantMembersTypeName,
  makeVariantPropsName,
  makeVariantsArgTypeName,
  makeWabHtmlTextClassName,
  makeWabInstanceClassName,
  makeWabTextClassName,
  maybeMakePlasmicImgSrc,
  NodeNamer,
  shortPlasmicPrefix,
  wrapGlobalContexts,
  wrapGlobalProvider,
  wrapGlobalProviderWithCustomValue,
} from "@/wab/shared/codegen/react-p/utils";
import { exportActiveSplitsConfig } from "@/wab/shared/codegen/splits";
import {
  extractUsedGlobalVariantCombosForTokens,
  extractUsedGlobalVariantsForTokens,
  extractUsedTokensForComponents,
  extractUsedTokensForTheme,
} from "@/wab/shared/codegen/style-tokens";
import {
  CodegenScheme,
  ComponentExportOutput,
  CustomFunctionConfig,
  ExportOpts,
  ExportPlatformOptions,
  InterpreterMeta,
  PageMetadata,
  ProjectConfig,
  StyleConfig,
  TargetEnv,
} from "@/wab/shared/codegen/types";
import {
  cleanPlainText,
  jsLiteral,
  jsString,
  paramToVarName,
  plainTextToReact,
  sortedDict,
  toClassName,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  extractUsedGlobalVariantsForComponents,
  makeGlobalVariantGroupImportTemplate,
  makeGlobalVariantGroupUseName,
  makeGlobalVariantGroupValueTypeName,
  makeUniqueUseScreenVariantsName,
  serializeVariantArgsGroupType,
  serializeVariantGroupMembersType,
  serializeVariantsArgsTypeContent,
} from "@/wab/shared/codegen/variants";
import {
  arrayEq,
  assert,
  ensure,
  ensureArray,
  isNonNil,
  strict,
  tuple,
  UnexpectedTypeError,
  uniqueName,
  withDefault,
  withDefaultFunc,
  withoutNils,
} from "@/wab/shared/common";
import {
  findVariantGroupForParam,
  getCodeComponentHelperImportName,
  getComponentDisplayName,
  getNonVariantParams,
  getRealParams,
  getRepetitionElementName,
  getRepetitionIndexName,
  getSuperComponents,
  getSuperComponentVariantToComponent,
  getVariantParams,
  isCodeComponent,
  isHostLessCodeComponent,
  isPageComponent,
  PageComponent,
  tryGetVariantGroupValueFromArg,
} from "@/wab/shared/core/components";
import {
  codeLit,
  ExprCtx,
  extractReferencedParam,
  getCodeExpressionWithFallback,
  getRawCode,
  jsonLit,
  removeFallbackFromDataSourceOp,
  code as toCode,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { ParamExportType } from "@/wab/shared/core/lang";
import {
  isTagInline,
  normalizeMarkers,
} from "@/wab/shared/core/rich-text-util";
import {
  allImageAssets,
  allImportedStyleTokensWithProjectInfo,
  allMixins,
  allStyleTokens,
  allStyleTokensDict,
  CssProjectDependencies,
  isHostLessPackage,
} from "@/wab/shared/core/sites";
import { SplitStatus } from "@/wab/shared/core/splits";
import {
  DATA_SOURCE_ACTIONS,
  getLastPartOfImplicitStateName,
  getStateDisplayName,
  getStateOnChangePropName,
  getStateValuePropName,
  getStateVarName,
  getVirtualWritableStateInitialValue,
  isOnChangeParam,
  isReadonlyState,
  isWritableState,
  LOGIN_ACTIONS,
} from "@/wab/shared/core/states";
import {
  plasmicImgAttrStyles,
  TPL_COMPONENT_PROPS,
} from "@/wab/shared/core/style-props";
import {
  CssVarResolver,
  defaultStyleClassNames,
  getRelevantVariantCombosForTheme,
  getRelevantVariantCombosForToken,
  getTriggerableSelectors,
  hasClassnameOverride,
  makeBaseRuleNamer,
  makeCssTokenVarsRules,
  makeDefaultStylesRules,
  makeDefaultStyleValuesDict,
  makeLayoutVarsRules,
  makeMixinVarsRules,
  makePseudoClassAwareRuleNamer,
  makePseudoElementAwareRuleNamer,
  makeStyleExprClassName,
  makeStyleScopeClassName,
  mkComponentRootResetRule,
  mkThemeStyleRule,
  showSimpleCssRuleSet,
  tryAugmentRulesWithScreenVariant,
} from "@/wab/shared/core/styles";
import {
  ancestorsUp,
  findVariantSettingsUnderTpl,
  flattenTpls,
  getAllEventHandlersForTpl,
  isAttrEventHandler,
  isTplCodeComponent,
  isTplComponent,
  isTplImage,
  isTplNamable,
  isTplRepeated,
  isTplSlot,
  isTplTag,
  isTplTagOrComponent,
  isTplTextBlock,
  summarizeTpl,
  tplHasRef,
  TplTagType,
  TplTextTag,
  walkTpls,
} from "@/wab/shared/core/tpls";
import { getCssRulesFromRs, tryGetBrowserCssInitial } from "@/wab/shared/css";
import {
  applyPlasmicUserDevFlagOverrides,
  DEVFLAGS,
  DevFlagsType,
  getProjectFlags,
} from "@/wab/shared/devflags";
import { exprUsesCtxOrFreeVars } from "@/wab/shared/eval/expression-parser";
import {
  extractAllVariantCombosForText,
  genLocalizationString,
  isLocalizableTextBlock,
  LOCALIZABLE_HTML_ATTRS,
  LocalizableStringSource,
  LocalizationConfig,
  makeLocalizationStringKey,
} from "@/wab/shared/localization";
import {
  CodeLibrary,
  Component,
  ComponentDataQuery,
  ComponentVariantGroup,
  CustomFunction,
  ensureKnownNamedState,
  ensureKnownVariantGroup,
  Expr,
  ImageAsset,
  ImageAssetRef,
  isKnownColorPropType,
  isKnownCustomCode,
  isKnownDefaultStylesClassNamePropType,
  isKnownDefaultStylesPropType,
  isKnownEventHandler,
  isKnownExprText,
  isKnownFunctionType,
  isKnownGlobalVariantSplitContent,
  isKnownImageAssetRef,
  isKnownNamedState,
  isKnownObjectPath,
  isKnownRawText,
  isKnownRenderExpr,
  isKnownRenderFuncType,
  isKnownStateParam,
  isKnownStyleExpr,
  isKnownStyleScopeClassNamePropType,
  isKnownStyleTokenRef,
  isKnownTplComponent,
  isKnownTplSlot,
  isKnownTplTag,
  isKnownVirtualRenderExpr,
  PageMeta,
  Param,
  RichText,
  Site,
  State,
  StyleToken,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantGroup,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { isImageType, wabToTsType } from "@/wab/shared/model/model-util";
import {
  getPlumeCodegenPlugin,
  PlumeType,
} from "@/wab/shared/plume/plume-registry";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import {
  deriveSizeStyleValue,
  getPageComponentSizeType,
} from "@/wab/shared/sizingutils";
import {
  getSlotParams,
  isDescendantOfVirtualRenderExpr,
  isPlainTextArgNode,
  isStyledTplSlot,
  isTplPlainText,
} from "@/wab/shared/SlotUtils";
import { ensureBaseVariant } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getIntegrationsUrl, getPublicUrl } from "@/wab/shared/urls";
import {
  makeGlobalVariantComboSorter,
  makeVariantComboSorter,
  sortedVariantCombos,
  sortedVariantSettings,
  VariantComboSorter,
} from "@/wab/shared/variant-sort";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  getBaseVariant,
  getReferencedVariantGroups,
  hasStyleVariant,
  isActiveVariantSetting,
  isArbitraryCssSelector,
  isBaseRuleVariant,
  isBaseVariant,
  isGlobalVariant,
  isScreenVariant,
  isStandaloneVariantGroup,
  isStyleVariant,
  VariantCombo,
  VariantGroupType,
} from "@/wab/shared/Variants";
import L, { groupBy, sortBy } from "lodash";
import memoizeOne from "memoize-one";
import type { SetRequired } from "type-fest";

export const nodeNameBackwardsCompatibility = {
  textInput: "textbox",
};

function sortedVSettings(ctx: SerializerBaseContext, node: TplNode) {
  return sortedVariantSettings(node.vsettings, ctx.variantComboSorter);
}

export function exportStyleConfig(
  opts: SetRequired<Partial<ExportOpts>, "targetEnv">
): StyleConfig {
  const { stylesOpts, targetEnv } = opts;
  const useCssModules = stylesOpts?.scheme === "css-modules";
  const defaultStylesRules = [
    ...makeDefaultStylesRules(
      useCssModules ? "" : `${makeDefaultStyleClassNameBase(opts)}__`,
      opts
    ),
    `.${makeDefaultStyleCompWrapperClassName(opts)} { display: grid; }`,
    `.${makeDefaultInlineClassName(opts)} { display: inline; }`,
    `.plasmic_page_wrapper { display: flex; width: 100%; min-height: 100vh; align-items: stretch; align-self: start;}`,
    `.plasmic_page_wrapper > * { height: auto !important; }`,
    `.${makeWabHtmlTextClassName(opts)} { white-space: normal; }`,
  ];
  return {
    defaultStyleCssFileName,
    defaultStyleCssRules: defaultStylesRules.join("\n"),
  };
}

function createInterpreterMeta(): InterpreterMeta {
  return {
    nodeUuidToClassNames: {},
    nodeUuidToName: {},
    nodeUuidToOrderedVsettings: {},
  };
}

let interpreterMeta: InterpreterMeta | undefined = undefined;
export function exportProjectConfig(
  site: Site,
  projectName: string,
  projectId: string,
  revision: number,
  projectRevId: string,
  version: string,
  exportOpts: SetRequired<Partial<ExportOpts>, "targetEnv">,
  indirect = false,
  scheme: CodegenScheme = "blackbox"
): ProjectConfig {
  const fontUsages = extractUsedFontsFromComponents(site, site.components);

  const fontsCss =
    exportOpts?.fontOpts?.scheme === "none" ? "" : makeCssImports(fontUsages);

  // For loader, infix the css variables from the default styles with the project id.
  // This is to make sure each project uses the default style specified for it and not
  // get it overwritten by another project.
  const shortProjectId = projectId.slice(0, 5);

  const resolver = new CssVarResolver(
    allStyleTokens(site, { includeDeps: "all" }),
    allMixins(site, { includeDeps: "all" }),
    allImageAssets(site, { includeDeps: "all" }),
    site.activeTheme,
    {
      useCssVariables: true,
      cssVariableInfix: shortProjectId,
    }
  );
  const rootResetClass = makeRootResetClassName(projectId, {
    targetEnv: exportOpts.targetEnv,
    useCssModules: exportOpts?.stylesOpts?.scheme === "css-modules",
  });
  const resetRule = mkComponentRootResetRule(site, rootResetClass, resolver);

  const defaultTagStylesVarsRules = makeMixinVarsRules(
    site,
    withoutNils([
      site.activeTheme?.defaultStyle,
      ...(site.activeTheme?.styles.map((theme) => theme.style) ?? []),
    ]),
    `.${makePlasmicDefaultStylesClassName(exportOpts)}`,
    {
      targetEnv: exportOpts.targetEnv,
      whitespace:
        DEVFLAGS.whitespaceNormalProjectIds.includes(projectId) ||
        getProjectFlags(site).useWhitespaceNormal
          ? "normal"
          : "enforce",
      cssVariableInfix: shortProjectId,
    }
  );

  const cssMixinPropVarsRules = makeMixinVarsRules(
    site,
    site.mixins,
    `.${makePlasmicMixinsClassName(exportOpts)}`,
    {
      targetEnv: exportOpts.targetEnv,
      generateExternalCssVar: true,
      onlyBoxShadow: true,
    }
  );

  const defaultTagStyles = site.activeTheme?.styles
    .map((s) =>
      mkThemeStyleRule(rootResetClass, resolver, s, {
        classNameBase: makeDefaultStyleClassNameBase(exportOpts),
        useCssModules: exportOpts?.stylesOpts?.scheme === "css-modules",
        targetEnv: exportOpts.targetEnv,
      })
    )
    .join("\n");
  const cssTokenVarsRules = makeCssTokenVarsRules(
    site,
    allStyleTokens(
      site,
      exportOpts?.includeImportedTokens ? { includeDeps: "all" } : {}
    ),
    `.${makePlasmicTokensClassName(exportOpts)}`,
    { generateExternalToken: true, targetEnv: exportOpts.targetEnv }
  );
  const layoutVarsRules = makeLayoutVarsRules(
    site,
    `.${makePlasmicTokensClassName(exportOpts)}`
  );

  const cssFileName = makeCssFileName(
    exportOpts.idFileNames
      ? makeCssProjectIdFileName(projectId)
      : makeCssProjectFileName(),
    exportOpts
  );

  const globalContextBundle = makeGlobalContextBundle(
    site,
    projectId,
    exportOpts
  );

  const splitsProviderBundle = makeSplitsProviderBundle(
    site,
    projectId,
    exportOpts
  );

  return {
    projectName,
    projectId,
    cssFileName,
    cssRules: `
      ${fontsCss}
      ${cssTokenVarsRules}
      ${layoutVarsRules}
      ${defaultTagStylesVarsRules}
      ${cssMixinPropVarsRules}
      ${
        // If we're using CSS modules, defaultcss should be generated inside
        // the projectcss module.
        exportOpts?.stylesOpts?.scheme === "css-modules"
          ? exportStyleConfig(exportOpts).defaultStyleCssRules
          : ""
      }
      ${resetRule}
      ${defaultTagStyles ?? ""}
    `,
    revision,
    projectRevId,
    version,
    fontUsages,
    globalContextBundle,
    splitsProviderBundle,
    indirect,
    reactWebExportedFiles:
      scheme === "plain" ? reactWebExportedFiles : undefined,
  };
}

export function makeGlobalContextBundle(
  site: Site,
  projectId: string,
  opts: Partial<ExportOpts>
) {
  if (site.globalContexts.length === 0) {
    return undefined;
  }

  assert(opts.platform, "Missing platform in exportOpts");
  const referencedComponents = site.globalContexts.map((tpl) => tpl.component);
  const aliases = makeComponentAliases(referencedComponents, opts.platform);
  const referencedImports = generateReferencedImports(
    referencedComponents,
    opts as any,
    false,
    false,
    aliases
  );
  const componentSubstitutionCalls = opts.useComponentSubstitutionApi
    ? generateSubstituteComponentCalls(
        referencedComponents,
        opts as any,
        aliases
      )
    : [];

  const overrideProps = referencedComponents.map((c) => {
    const componentName = aliases.get(c) || getExportedComponentName(c);
    return `${makeGlobalContextPropName(c, aliases)}?: Partial<
           Omit<React.ComponentProps<typeof ${componentName}>, "children">>;`;
  });
  const overridePropNames = referencedComponents.map((c) =>
    makeGlobalContextPropName(c, aliases)
  );

  const variantChecker = makeGlobalVariantComboChecker(site);

  let content = `{ children }`;

  const projectFlags = getProjectFlags(site);
  const exprCtx: ExprCtx = {
    projectFlags,
    component: null,
    inStudio: opts.isLivePreview,
  };

  for (let i = site.globalContexts.length - 1; i >= 0; i--) {
    const tpl = site.globalContexts[i];
    const componentName =
      aliases.get(tpl.component) || getExportedComponentName(tpl.component);
    const overridePropName = makeGlobalContextPropName(tpl.component);
    const params = getRealParams(tpl.component);
    const props: L.Dictionary<string> = {};
    for (const param of params) {
      const maybeArg = tpl.vsettings[0].args.find((arg) => arg.param === param);
      const varName = paramToVarName(tpl.component, param);
      let serializedExpr = "undefined";
      if (
        opts.forceAllProps ||
        param.exportType !== ParamExportType.ToolsOnly
      ) {
        if (isKnownDefaultStylesPropType(param.type)) {
          const conditionals = buildConditionalDefaultStylesPropArg(site);
          serializedExpr = joinVariantVals(
            conditionals.map(([expr, combo]) => [
              getRawCode(expr, exprCtx),
              combo,
            ]),
            variantChecker,
            "undefined"
          ).value;
        } else if (maybeArg) {
          if (
            isKnownColorPropType(param.type) &&
            isKnownStyleTokenRef(maybeArg.expr) &&
            !param.type.noDeref
          ) {
            const conditionals = buildConditionalDerefTokenValueArg(
              site,
              maybeArg.expr.token
            );
            serializedExpr = joinVariantVals(
              conditionals.map(([expr, combo]) => [
                getRawCode(expr, exprCtx),
                combo,
              ]),
              variantChecker,
              "undefined"
            ).value;
          } else {
            serializedExpr = getRawCode(maybeArg.expr, exprCtx);
          }
        } else if (param.defaultExpr) {
          serializedExpr = getRawCode(param.defaultExpr, exprCtx);
        }
      } else if (param.defaultExpr) {
        serializedExpr = getRawCode(param.defaultExpr, exprCtx);
      }

      serializedExpr = `(${overridePropName} && "${varName}" in ${overridePropName}) ? ${overridePropName}.${varName}! : ${serializedExpr}`;
      props[varName] = serializedExpr;
    }
    const keys = L.keys(props).sort();
    content = `
      <${componentName}
      {...${overridePropName}}
      ${keys
        .map((key) => `${serializedKeyValue(key, `${props[key]}`)}`)
        .join("\n")}
      >
        ${content}
      </${componentName}>
    `;
  }

  const usedGlobalVariantGroups = new Set(
    [...variantChecker.checked].map((v) => v.parent!)
  );
  const importGlobalVariantGroups = [...usedGlobalVariantGroups]
    .map((vg) => makeGlobalVariantGroupImportTemplate(vg, ".", opts))
    .join("\n");

  const contextModule = `
    // @ts-nocheck
    /* eslint-disable */
    /* tslint:disable */
    // This class is auto-generated by Plasmic; please do not edit!
    // Plasmic Project: ${projectId}

    ${makeUseClient(opts)}

    import * as React from "react"
    import {hasVariant, ensureGlobalVariants} from "${getReactWebPackageName(
      opts
    )}";
    ${referencedImports.join("\n")}
    ${importGlobalVariantGroups}

    export interface GlobalContextsProviderProps {
      children?: React.ReactElement;
      ${overrideProps.join("\n")}
    }

    export default function GlobalContextsProvider(props: GlobalContextsProviderProps) {
      ${
        opts.useComponentSubstitutionApi
          ? componentSubstitutionCalls.join("\n")
          : ""
      }
      const {
        children,
        ${overridePropNames.join(",\n")}
      } = props;

      ${serializeGlobalVariantValues(usedGlobalVariantGroups)}
      return (${content})
    }
  `;

  return { id: projectId, contextModule };
}

export function generateReferencedImports(
  components: Component[],
  opts: ExportOpts,
  importArgType: boolean,
  // If true, the reference is from the implementation dir; otherwise, it is
  // from the autogen dir.
  fromImpl: boolean,
  aliases: ImportAliasesMap,
  replacedHostlessComponentImportPath?: Map<Component, string>
) {
  const pathToImplDir = fromImpl
    ? "."
    : ensure(
        opts.relPathFromManagedToImplDir,
        "Missing relPathFromManagedToImplDir"
      );
  const pathToManagedDir = fromImpl
    ? ensure(
        opts.relPathFromImplToManagedDir,
        "Missing relPathFromImplToManagedDir"
      )
    : ".";

  const makeComponentImportPath = (c: Component) => {
    if (c.codeComponentMeta?.importPath === "@plasmicapp/react-web") {
      return getReactWebPackageName(opts);
    }
    if (
      isHostLessCodeComponent(c) &&
      opts.hostLessComponentsConfig === "package"
    ) {
      return (
        replacedHostlessComponentImportPath?.get(c) ??
        c.codeComponentMeta?.importPath
      );
    }
    // Even for code components, we do not use the configured import path;
    // instead, we will fix it up in the cli
    return `${pathToImplDir}/${
      opts.idFileNames
        ? makeComponentSkeletonIdFileName(c)
        : getExportedComponentName(c)
    }`;
  };

  const makeCodeComponentHelperImportPath = (c: CodeComponentWithHelpers) => {
    const helpers = c.codeComponentMeta.helpers;
    if (helpers.importPath === "@plasmicapp/react-web") {
      return getReactWebPackageName(opts);
    }
    if (
      isHostLessCodeComponent(c) &&
      opts.hostLessComponentsConfig === "package"
    ) {
      return helpers.importPath;
    }
    return `${pathToImplDir}/${
      opts.idFileNames
        ? opts.useCodeComponentHelpersRegistry
          ? makeComponentSkeletonIdFileName(c)
          : makeCodeComponentHelperSkeletonIdFileName(c)
        : getCodeComponentHelperImportName(c)
    }`;
  };

  const shouldSkipPlasmicImportTag = (component: Component) =>
    isHostLessCodeComponent(component);
  const referencedPlasmicImports = components.flatMap((c) => {
    const imports: string[] = [];
    const importName = makeComponentImportName(c, aliases, opts);
    const importPath = makeComponentImportPath(c);
    const importTag = `${c.uuid}/${
      isCodeComponent(c) ? "codeComponent" : "component"
    }`;
    imports.push(
      `import ${importName} from "${importPath}";${
        !shouldSkipPlasmicImportTag(c)
          ? `  // plasmic-import: ${importTag}`
          : ""
      }`
    );

    if (importArgType && !isCodeComponent(c)) {
      const plasmicImportPath = `${pathToManagedDir}/${
        opts.idFileNames
          ? makeComponentRenderIdFileName(c)
          : makePlasmicComponentName(c)
      }"`;
      imports.push(
        `import {${makeVariantsArgTypeName(c)}} from "${plasmicImportPath}";${
          !shouldSkipPlasmicImportTag(c)
            ? `  // plasmic-import: ${c.uuid}/render`
            : ""
        }`
      );
    }
    if (isCodeComponentWithHelpers(c)) {
      imports.push(
        `import ${makeCodeComponentHelperImportName(
          c,
          opts,
          aliases
        )} from "${makeCodeComponentHelperImportPath(c)}";${
          !shouldSkipPlasmicImportTag(c)
            ? ` // plasmic-import: ${c.uuid}/codeComponentHelper`
            : ""
        }`
      );
    }
    return imports;
  });
  return referencedPlasmicImports;
}

export function generateCodeComponentsHelpersFromRegistry(
  components: Component[],
  aliases: ImportAliasesMap,
  opts: ExportOpts
) {
  return components
    .filter(
      (c) =>
        isCodeComponentWithHelpers(c) &&
        !(
          isHostLessCodeComponent(c) &&
          opts.hostLessComponentsConfig === "package"
        )
    )
    .map((c) => {
      assert(isCodeComponentWithHelpers(c), "checked before");
      return `const ${getImportedCodeComponentHelperName(
        aliases,
        c
      )} = getCodeComponentHelper__${getImportedComponentName(aliases, c)}()`;
    });
}

export function generateSubstituteComponentCalls(
  components: Component[],
  opts: ExportOpts,
  aliases: ImportAliasesMap
) {
  assert(
    opts.useComponentSubstitutionApi,
    () => `Should only be called when useComponentSubstitutionApi is set`
  );
  return components
    .filter((c) => !isHostLessCodeComponent(c))
    .map((c) => {
      const aliasedName = aliases.get(c) || getExportedComponentName(c);
      return `const ${aliasedName} = getPlasmicComponent__${aliasedName}();`;
    });
}

export function deriveReactHookSpecs(
  component: Component,
  nodeNamer: NodeNamer
) {
  const vsAndTpls = [...findVariantSettingsUnderTpl(component.tplTree)];
  const styleVariantsForHookCheck = vsAndTpls
    .filter(([vs, _tpl]) => shouldGenReactHook(vs, component))
    .flatMap(([vs, tpl]) =>
      vs.variants
        .filter(
          (v) => isStyleVariant(v) && getTriggerableSelectors(v).length > 0
        )
        .map((v) => tuple(v, tpl))
    );

  const reactHookSpecs = L.uniqBy(
    styleVariantsForHookCheck,
    (svAndTpl) => svAndTpl[0]
  ).map(([sv, tpl]) => new ReactHookSpec(sv, tpl, component, nodeNamer));

  return reactHookSpecs;
}

export function computeSerializerSiteContext(
  site: Site
): SerializerSiteContext {
  return {
    projectFlags: getProjectFlags(site),
    cssProjectDependencies: L.uniqBy(
      allImportedStyleTokensWithProjectInfo(site),
      "projectId"
    ),
    cssVarResolver: new CssVarResolver(
      allStyleTokens(site, { includeDeps: "all" }),
      allMixins(site, { includeDeps: "all" }),
      allImageAssets(site, { includeDeps: "all" }),
      site.activeTheme
    ),
  };
}

export function exportReactPresentational(
  componentGenHelper: ComponentGenHelper,
  component: Component,
  site: Site,
  projectConfig: ProjectConfig,
  s3ImageLinks: Record<string, string>,
  isPlasmicHosted: boolean,
  forceAllCsr: boolean,
  appAuthProvider: AppAuthProvider | undefined,
  opts: ExportOpts = {
    lang: "ts",
    relPathFromImplToManagedDir: ".",
    relPathFromManagedToImplDir: ".",
    forceAllProps: false,
    forceRootDisabled: false,
    imageOpts: { scheme: "inlined" },
    stylesOpts: { scheme: "css" },
    codeOpts: { reactRuntime: "classic" },
    platform: "react",
    fontOpts: { scheme: "import" },
    codeComponentStubs: false,
    skinnyReactWeb: false,
    skinny: false,
    importHostFromReactWeb: false,
    hostLessComponentsConfig: "package",
    useComponentSubstitutionApi: false,
    useGlobalVariantsSubstitutionApi: false,
    useCodeComponentHelpersRegistry: false,
    isLivePreview: false,
    whitespaceNormal: false,
    useCustomFunctionsStub: false,
    targetEnv: "codegen",
  },
  siteCtx: SerializerSiteContext
): ComponentExportOutput {
  interpreterMeta = createInterpreterMeta();
  if (!opts.relPathFromImplToManagedDir) {
    opts.relPathFromImplToManagedDir = ".";
  }
  if (!opts.relPathFromManagedToImplDir) {
    opts.relPathFromManagedToImplDir = ".";
  }
  const { fakeTpls, replacedHostlessComponentImportPath } =
    optimizeGeneratedCodeForHostlessPackages(
      component,
      site,
      opts.isLivePreview ?? false
    );
  const nodeNamer = makeNodeNamer(component);
  const reactHookSpecs = deriveReactHookSpecs(component, nodeNamer);

  const projectFlags = siteCtx.projectFlags;
  if (opts.isPlasmicTeamUser) {
    applyPlasmicUserDevFlagOverrides(projectFlags);
  }
  if (
    DEVFLAGS.whitespaceNormalProjectIds.includes(projectConfig.projectId) ||
    projectFlags.useWhitespaceNormal
  ) {
    opts.whitespaceNormal = true;
  }

  // The array of global variants used for non css purpose, including visibility
  // change and text change.
  const usedGlobalVariantGroups = getUsedGlobalVariantGroups(
    site,
    component,
    projectFlags
  );
  const variantComboChecker = makeVariantComboChecker(
    component,
    reactHookSpecs,
    "triggers"
  );

  const referencedComponents = componentToReferenced(component);
  // Also tack on subcomponents of this component, so Plasmic* always
  // have them imported
  for (const subComp of component.subComps) {
    if (!referencedComponents.includes(subComp)) {
      referencedComponents.push(subComp);
    }
  }

  // If the component has componentDataQueries, we will also need to use Fetcher
  const fetcherComponent = site.components.find(
    (c) =>
      c.name === getBuiltinComponentRegistrations().PlasmicFetcher.meta.name
  );
  if (
    fetcherComponent &&
    component.dataQueries.length > 0 &&
    !referencedComponents.includes(fetcherComponent)
  ) {
    referencedComponents.push(fetcherComponent);
  }

  const unauthorizedComp = site.defaultComponents.unauthorized;
  if (
    isPageComponent(component) &&
    appAuthProvider &&
    unauthorizedComp &&
    !referencedComponents.includes(unauthorizedComp)
  ) {
    referencedComponents.push(unauthorizedComp);
  }

  const ctx: SerializerBaseContext = {
    componentGenHelper,
    component,
    nodeNamer,
    reactHookSpecs,
    site,
    siteCtx,
    projectConfig,
    usedGlobalVariantGroups,
    variantComboChecker,
    variantComboSorter: makeVariantComboSorter(site, component),
    exportOpts: opts,
    aliases: makeComponentAliases(referencedComponents, opts.platform),
    s3ImageLinks,
    projectFlags,
    cssVarResolver: siteCtx.cssVarResolver,
    usesDataSourceInteraction: hasDataSourceInteractions(component),
    usesLoginInteraction:
      !!component.pageMeta?.roleId || hasLoginInteractions(component),
    usesGlobalActions: hasGlobalActions(component),
    usesComponentLevelQueries:
      component.dataQueries.filter((q) => !!q.op).length > 0,
    cache: {},
    forceAllCsr,
    appAuthProvider,
    isPlasmicHosted,
    serializeTplNode,
    exprCtx: {
      projectFlags,
      component,
      inStudio: opts.isLivePreview,
    },
    fakeTpls,
    replacedHostlessComponentImportPath,
  };
  const variantsType = serializeVariantsArgsType(ctx);
  const argsType = serializeArgsType(ctx);
  const overridesType = serializeOverridesType(ctx);
  const iconImports = makeIconImports(
    site,
    component,
    ctx.exportOpts,
    "managed",
    ctx.aliases
  );
  const renderFunc = serializeRenderFunc(ctx, referencedComponents);
  const descendantsLookup = serializeDescendantsLookup(ctx);
  const nodeComponents = serializeNodeComponents(ctx);
  const skeletonModule = serializeSkeletonWrapperTs(ctx, opts);
  const { customFunctionsAndLibsImport, serializedCustomFunctionsAndLibs } =
    serializeCustomFunctionsAndLibs(ctx);

  const referencedImports = generateReferencedImports(
    referencedComponents,
    opts,
    false,
    // The imports are used in the autogen directory.
    false,
    ctx.aliases,
    ctx.replacedHostlessComponentImportPath
  );

  const importGlobalVariantContexts =
    usedGlobalVariantGroups.size === 0
      ? ""
      : `
    ${[...usedGlobalVariantGroups]
      .map((vg) => makeGlobalVariantGroupImportTemplate(vg, ".", opts))
      .join("\n")}
  `;

  const componentName = makePlasmicComponentName(component);
  const styleImportName = makeCssFileName(
    opts.idFileNames ? makeComponentCssIdFileName(component) : componentName,
    opts
  );
  const isPage = isPageComponent(component);
  const plumeType = component.plumeInfo?.type as PlumeType | undefined;
  const plumePlugin = getPlumeCodegenPlugin(component);

  // The entry point for page components is the render module (and not the
  // skeleton as other components). For that reason, we need to expose
  // the component substitution API in the render module.
  const componentSubstitutionApi =
    isPage && opts.useComponentSubstitutionApi
      ? `import { components } from "@plasmicapp/loader-runtime-registry";

    export function getPlasmicComponent() {
      return components["${component.uuid}"] ?? ${componentName};
    }`
      : "";

  const importCodeComponentHelperRegistry = opts.useCodeComponentHelpersRegistry
    ? `import { codeComponentHelpers } from "@plasmicapp/loader-runtime-registry"`
    : "";

  const initUserCodeWrappers = ctx.exprCtx.inStudio
    ? `
const __wrapUserFunction = globalThis.__PlasmicWrapUserFunction ?? ((loc, fn) => fn());
const __wrapUserPromise = globalThis.__PlasmicWrapUserPromise ?? (async (loc, promise) => { return await promise; });
  `
    : "";

  // We import a lot of things from @plasmicapp/react-web. For components,
  // we append a "__" suffix in case there's any name collision with other
  // components that we may be importing into this file. We don't need
  // to worry about non-components, as we don't expect name collisions there.
  const renderModule = `
    // @ts-nocheck
    /* eslint-disable */
    /* tslint:disable */
    /* prettier-ignore-start */
    ${
      opts.codeOpts.reactRuntime === "automatic"
        ? `
    /** @jsxImportSource @plasmicapp/react-web-runtime */
    `
        : `
    /** @jsxRuntime classic */
    /** @jsx createPlasmicElementProxy */
    /** @jsxFrag React.Fragment */
    `
    }
    // This class is auto-generated by Plasmic; please do not edit!
    // Plasmic Project: ${projectConfig.projectId}
    // Component: ${component.uuid}
    // plasmic-unformatted

    ${makeUseClient(opts)}

    import * as React from "react";
    ${makePlatformImports(opts)}

    import {
      ${getReactWebNamedImportsForRender()}
    } from  "${getReactWebPackageName(opts)}";
    import {
      ${getHostNamedImportsForRender()}
    } from "${getHostPackageName(opts)}";
    ${
      shouldWrapWithUsePlasmicAuth(ctx, component)
        ? `import * as plasmicAuth from "${getPlasmicAuthPackageName(opts)}";`
        : ""
    }
    ${
      ctx.usesDataSourceInteraction ||
      ctx.usesLoginInteraction ||
      shouldWrapWithUsePlasmicAuth(ctx, component)
        ? `import { usePlasmicDataSourceContext } from "@plasmicapp/data-sources-context";`
        : ""
    }
    ${
      ctx.usesDataSourceInteraction || ctx.usesComponentLevelQueries
        ? `import { executePlasmicDataOp, usePlasmicDataOp, usePlasmicInvalidate } from "${getDataSourcesPackageName()}";`
        : ""
    }
    ${
      plumeType
        ? `import * as pp from "${getPlumePackageName(opts, plumeType)}";`
        : ""
    }
    ${referencedImports.join("\n")}
    ${importGlobalVariantContexts}
    ${makeStylesImports(
      siteCtx.cssProjectDependencies,
      component,
      projectConfig,
      ctx.exportOpts
    )}
    ${iconImports}
    ${makePictureImports(site, component, ctx.exportOpts, "managed")}
    ${makeSuperCompImports(component, ctx.exportOpts)}
    ${customFunctionsAndLibsImport}

    ${
      // We make a reference to createPlasmicElementProxy, as in some setups,
      // it is getting removed from typescript's organizeImprts or
      // prettier-plugin-organize-imports, even though it is referenced
      // in @jsx
      opts.codeOpts.reactRuntime === "classic"
        ? "createPlasmicElementProxy"
        : ""
    }

    ${componentSubstitutionApi}
    ${importCodeComponentHelperRegistry}

    ${variantsType}

    ${argsType}

    ${overridesType}

    ${serializeDefaultExternalProps(ctx)}

    ${serializePlasmicSuperContext(ctx)}

    ${initUserCodeWrappers}

    ${/*serializeQueries(ctx)*/ ""}

    ${serializedCustomFunctionsAndLibs}

    ${
      isPageComponent(component) && ctx.exportOpts.platform === "gatsby"
        ? `export function Head() {
          return (
            <>
              ${renderPageHead(ctx, component)}
            </>
          );
        }`
        : ""
    }

    ${
      // We wrap Next.js useRouter() in a try...catch to avoid "next router
      // not mounted" error in extractPlasmicDataQuery.
      ctx.exportOpts.platform === "nextjs"
        ? `function useNextRouter() {
          try {
            return useRouter();
          } catch {}
          return undefined;
        }`
        : ""
    }

    ${renderFunc}

    ${plumePlugin ? plumePlugin.genHook(ctx) : ""}

    ${descendantsLookup}

    ${nodeComponents}

    export default ${componentName};
    /* prettier-ignore-end */
  `;

  const interpreterMeta_ = interpreterMeta;
  interpreterMeta = undefined;

  return {
    id: component.uuid,
    componentName: getExportedComponentName(component),
    plasmicName: getNormalizedComponentName(component),
    displayName: component.name,
    renderModule,
    skeletonModule,
    cssRules: serializeCssRules(ctx),
    renderModuleFileName: `${
      opts.idFileNames
        ? makeComponentRenderIdFileName(component)
        : componentName
    }.tsx`,
    skeletonModuleFileName: getSkeletonModuleFileName(component, opts),
    cssFileName: styleImportName,
    scheme: "blackbox",
    nameInIdToUuid: {},
    isPage,
    isGlobalContextProvider: component.codeComponentMeta?.isContext ?? false,
    plumeType: component.plumeInfo?.type,
    path: component.pageMeta?.path,
    ...(ctx.exportOpts.codeComponentStubs
      ? { isCode: isCodeComponent(component) }
      : {}),
    ...(isPage && {
      pageMetadata: makePageMetadataOutput(ctx),
    }),
    metadata: component.metadata,
    interpreterMeta: interpreterMeta_,
  };
}

type VariantComboChecker = (
  variantCombo: VariantCombo,
  ignoreScreenVariant?: boolean
) => string;
/**
 * Creates a function that, given a `Variant`, outputs code that checks
 * if that variant has been turned on.
 */
export function makeVariantComboChecker(
  component: Component,
  reactHookSpecs: ReactHookSpec[],
  triggersRef: string
) {
  const variantToSuperComp = getSuperComponentVariantToComponent(component);

  const getVariantsDictToCheck = (variant: Variant) => {
    if (isGlobalVariant(variant)) {
      // globalVariants is a local variable declared in render function
      // derived from global contexts
      return `globalVariants`;
    } else if (variantToSuperComp.has(variant)) {
      const superComp = ensure(
        variantToSuperComp.get(variant),
        `variantToSuperComp is missing variant ${variant.name} (uuid: ${variant.uuid})`
      );
      const compKey = getExportedComponentName(superComp);
      return `(superContexts.${compKey} && superContexts.${compKey}.variants) || {}`;
    } else {
      return `$state`;
    }
  };

  const nonStyleVariantChecker = (variant: Variant) => {
    if (isBaseVariant(variant)) {
      return "true";
    }
    const group = ensureKnownVariantGroup(variant.parent);
    const groupName = toVarName(group.param.variable.name);
    // `hasVariant` is imported from `plasmic` lib.
    return `hasVariant(
      ${getVariantsDictToCheck(variant)},
      ${jsString(groupName)},
      ${jsString(toVarName(variant.name))}
    )`;
  };

  const variantChecker = (variant: Variant) => {
    if (isStyleVariant(variant)) {
      const tplRoot = component.tplTree;
      if (isTplRootWithCodeComponentInteractionVariants(tplRoot)) {
        return variant.selectors
          .map((sel) => {
            return `$ccInteractions[${jsString(
              withoutInteractionVariantPrefix(sel)
            )}]`;
          })
          .join(" && ");
      }
      // One should only call variantChecker on style variants for non-css
      // variantSettings.
      const hook = ensure(
        reactHookSpecs.find((spec) => spec.sv === variant),
        `Missing reactHookSpec for variant ${variant.name} (uuid: ${variant.uuid})`
      );
      return hook.serializeIsTriggeredCheck(triggersRef);
    }
    return nonStyleVariantChecker(variant);
  };
  return (variantCombo: VariantCombo, ignoreScreenVariant?: boolean) => {
    const res = variantCombo
      // don't check for screen variant explicitly since media query will handle
      // it.
      .filter((v) => !(v.mediaQuery && ignoreScreenVariant))
      .map(variantChecker)
      .join(" && ");
    return res.length === 0 ? "true" : res;
  };
}

export function makeGlobalVariantComboChecker(_site: Site) {
  const checked = new Set<Variant>();
  const variantChecker = (variant: Variant) => {
    const group = ensureKnownVariantGroup(variant.parent);
    const groupName = toVarName(group.param.variable.name);
    // `hasVariant` is imported from `plasmic` lib.
    return `hasVariant(
      globalVariants,
      ${jsString(groupName)},
      ${jsString(toVarName(variant.name))}
    )`;
  };
  const checker = (combo: VariantCombo, ignoreScreenVariant?: boolean) => {
    combo.forEach((variant) => checked.add(variant));
    const res = combo
      // don't check for screen variant explicitly since media query will handle
      // it.
      .filter((v) => !(v.mediaQuery && ignoreScreenVariant))
      .map(variantChecker)
      .join(" && ");
    return res.length === 0 ? "true" : res;
  };
  checker.checked = checked;
  return checker;
}

/**
 * Creates a function that names TplNodes in the argument component.  The
 * name of each node is determined by `nodeJsName`, derived from explicitly-
 * specified node name, or derived from node type.  This name is the name
 * used in the `bindings` dict to refer to this node.
 *
 * Not all node will have a name; if a node has the exact same name as another
 * node, neither will have a name.
 *
 * TODO: have a more forgiving scheme for name conflict resolution here; maybe
 * name nodes after its full path in the tree, etc.
 */
export function makeNodeNamer(
  component: Component
): (node: TplNode) => string | undefined {
  const uidToName = buildUidToNameMap(component);
  return makeNodeNamerFromMap(uidToName);
}

export function buildUidToNameMap(component: Component) {
  const nodes = flattenTplsWithoutThrowawayNodes(component);
  const nodeNames: [TplNode, string][] = nodes.map((node) => [
    node,
    nodeJsName(component, node),
  ]);
  function go<Id extends string | number>(getId: (x: TplNode) => Id) {
    const idToName: Record<Id, string> = L(nodeNames)
      .groupBy(([_node, name]) => name)
      .toPairs()
      .map(([name, group]) => {
        if (group.length > 1) {
          // If there are multiple with the same name, this can happen
          // because some elements are explicitly named this, and some
          // are derived to this name (<form/> has a derived name "form").
          // In that case, we pick the actually explicitly named one.
          const actuallyNamed = group.find(([t]) => isTplNamable(t) && t.name);
          if (actuallyNamed) {
            return [getId(actuallyNamed[0]), name];
          } else {
            // None is actually named, so none gets a name
            return undefined;
          }
        } else {
          // Only one thing with this name, so use it
          return [getId(group[0][0]), name] as [Id, string];
        }
      })
      .filter(isNonNil)
      .fromPairs()
      .value() as Record<Id, string>;
    const root = component.tplTree;
    if (!L.has(idToName, getId(root))) {
      // Always make sure the root element has a name
      const existingNames: string[] = Object.values(idToName);
      const rootName = uniqueName(existingNames, "root", {
        normalize: toVarName,
      });
      idToName[getId(root)] = rootName;
    }
    return idToName;
  }
  if (interpreterMeta) {
    interpreterMeta.nodeUuidToName = go((x) => x.uuid);
  }
  return go((x) => x.uid);
}

export function makeNodeNamerFromMap(uidToName: Record<number, string>) {
  return (node: TplNode) => uidToName[node.uid];
}

function hasInteractionsWithName(component: Component, names: string[]) {
  return flattenTpls(component.tplTree)
    .flatMap((tpl) =>
      getAllEventHandlersForTpl(component, tpl).flatMap(({ expr }) => {
        return isKnownEventHandler(expr) ? expr.interactions : [];
      })
    )
    .some((interaction) => names.includes(interaction.actionName));
}

export function hasDataSourceInteractions(component: Component) {
  return hasInteractionsWithName(component, DATA_SOURCE_ACTIONS);
}

export function hasLoginInteractions(component: Component) {
  return hasInteractionsWithName(component, LOGIN_ACTIONS);
}

function hasGlobalActions(component: Component) {
  return flattenTpls(component.tplTree)
    .flatMap((tpl) =>
      getAllEventHandlersForTpl(component, tpl).flatMap(({ expr }) => {
        return isKnownEventHandler(expr) ? expr.interactions : [];
      })
    )
    .some((interaction) => interaction.actionName.includes("."));
}

/**
 * Flattens TplNodes in the component tree, but filters out nodes that should
 * not be serialized.
 */
export function flattenTplsWithoutThrowawayNodes(component: Component) {
  const result: TplNode[] = [];
  walkTpls(component.tplTree, {
    pre(tpl) {
      if (isThrowawayNode(tpl)) {
        return false;
      }
      result.push(tpl);
      return;
    },
  });
  return result;
}

function isThrowawayNode(node: TplNode) {
  if (isKnownTplSlot(node.parent)) {
    // If this is default content for a TplSlot, we don't need to allow overrides;
    // default content shouldn't really be used as-is.
    return true;
  }

  if (isPlainTextArgNode(node) && !node.name) {
    // Similarly, if this is text argument, then we also don't
    // need to generate styles or overrides... unless it has a name,
    // in which case, maybe the user intended to target it for
    // overrides.
    return true;
  }

  if (isDescendantOfVirtualRenderExpr(node)) {
    // If this node is part of the virtual tree, then it's not actually part of
    // this component and so won't be generated or named.
    return true;
  }
  return false;
}

/**
 * The js name for the node, derived from `node.name` or its summary.
 */
export function nodeJsName(component: Component, node: TplNode) {
  const name =
    (isTplNamable(node)
      ? node.name || (component.tplTree === node ? "root" : undefined)
      : undefined) || summarizeTpl(node);

  return toJsIdentifier(name);
}

/**
 * Whether we should generate react hooks to enable the VariantSetting. This is
 * needed when the VariantSetting is for a style variant where all style
 * variants in the chain are triggerable by code.
 * TODO: what happens to untriggerable VariantSetting? Consider a component with
 * the following structure
 *
 *   <a href="www.google.com">
 *     <div>I am a text</div>
 *   </a>
 *
 * Assuming the following variant structure
 *
 *   base
 *     :visited
 *       div <private, :hover>
 *
 * Then we are not generating VariantSetting for div's private hover variant.
 * We should probably give a warning in studio, or disallowing this case in
 * studio. Or, maybe we should generate code for it? Can we check if an DOM
 * element has a pseudo class?
 */
export function shouldGenReactHook(vs: VariantSetting, _component: Component) {
  // Get all the triggerable StyleVariants from vs.variants
  const svs = vs.variants.filter(
    (v) =>
      isStyleVariant(v) &&
      !isArbitraryCssSelector(v) &&
      getTriggerableSelectors(v).length > 0
  );
  if (svs.length === 0) {
    return false;
  }

  // Some triggers can only work programmatically with React hooks
  if (
    svs.some((sv) =>
      getTriggerableSelectors(sv).some(
        (t) => ensure(t.trigger, "Missing trigger condition").alwaysByHook
      )
    )
  ) {
    return true;
  }

  return (
    !!vs.dataCond ||
    !!vs.text ||
    vs.args.length > 0 ||
    !L.isEmpty(vs.attrs) ||
    !!vs.dataRep
  );
}

export function serializeGlobalVariantValues(groups: Set<VariantGroup>) {
  if (groups.size === 0) {
    return "";
  }
  const template = [...groups]
    .map((group) => {
      const name = toVarName(group.param.variable.name);
      if (group.type === VariantGroupType.GlobalScreen) {
        return `${name}: ${makeUniqueUseScreenVariantsName(group)}()`;
      }
      return `${name}: ${makeGlobalVariantGroupUseName(group)}()`;
    })
    .join(",\n");

  return `
  const globalVariants = ensureGlobalVariants({
    ${template}
  });
`;
}

function getOgImageLink(
  ctx: SerializerBaseContext,
  image: PageMeta["openGraphImage"]
) {
  if (!image) {
    return undefined;
  }
  if (L.isString(image)) {
    return image;
  }

  const imageLink = ctx.s3ImageLinks[image.uuid] || image.dataUri;

  assert(
    imageLink && imageLink.startsWith("http"),
    "The open graph image must be a valid, fully qualified URL."
  );

  return imageLink;
}

function serializePageMetadata(
  ctx: SerializerBaseContext,
  page: Component
): string {
  if (!isPageComponent(page)) {
    return "";
  }

  const title = page.pageMeta?.title || "";
  const description = page.pageMeta?.description || "";
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage) || "";
  const canonical = page.pageMeta?.canonical || "";

  const pageMetadata = JSON.stringify(
    { title, description, ogImageSrc, canonical },
    undefined,
    2
  );

  return `
    // Page metadata
    pageMetadata: ${pageMetadata},
  `;
}

function serializePageMetadataKey(ctx: SerializerBaseContext, key: string) {
  const componentName = makePlasmicComponentName(ctx.component);
  return `${componentName}.pageMetadata.${key}`;
}

function renderPageHead(ctx: SerializerBaseContext, page: Component): string {
  const title = page.pageMeta?.title;
  const description = page.pageMeta?.description;
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage);
  const canonical = page.pageMeta?.canonical;

  const shouldRenderHead = title || description || ogImageSrc || canonical;
  if (!shouldRenderHead || ctx.exportOpts.skipHead) {
    return "";
  }

  return strict`
    ${
      ogImageSrc
        ? strict`<meta name="twitter:card" content="summary_large_image" />`
        : strict`<meta name="twitter:card" content="summary" />`
    }
    ${
      title
        ? strict`<title key="title">{${serializePageMetadataKey(
            ctx,
            "title"
          )}}</title>
          <meta key="og:title" property="og:title" content={${serializePageMetadataKey(
            ctx,
            "title"
          )}} />
          <meta key="twitter:title" name="twitter:title" content={${serializePageMetadataKey(
            ctx,
            "title"
          )}} />`
        : ""
    }
    ${
      description
        ? strict`<meta key="description" name="description" content={${serializePageMetadataKey(
            ctx,
            "description"
          )}} />
          <meta key="og:description" property="og:description" content={${serializePageMetadataKey(
            ctx,
            "description"
          )}} />
          <meta key="twitter:description" name="twitter:description" content={${serializePageMetadataKey(
            ctx,
            "description"
          )}} />`
        : ""
    }
    ${
      ogImageSrc
        ? strict`<meta key="og:image" property="og:image" content={${serializePageMetadataKey(
            ctx,
            "ogImageSrc"
          )}} />
          <meta key="twitter:image" name="twitter:image" content={${serializePageMetadataKey(
            ctx,
            "ogImageSrc"
          )}} />`
        : ""
    }
    ${
      canonical
        ? strict`<link ref="canonical" href={${serializePageMetadataKey(
            ctx,
            "canonical"
          )}} />`
        : ""
    }
  `;
}

function renderFullViewportStyle(ctx: SerializerBaseContext): string {
  if (
    ctx.exportOpts.platform === "gatsby" ||
    ctx.exportOpts.platform === "nextjs"
  ) {
    return `
      <style>{\`
        body {
          margin: 0;
        }
      \`}</style>
    `;
  }

  return "";
}

export function renderPage(
  ctx: SerializerBaseContext,
  page: PageComponent,
  renderBody: string
): string {
  const sizeType = getPageComponentSizeType(page);
  if (sizeType === "stretch") {
    // For stretching pages, we need to wrap it in a horizontal flex container
    // with `min-height: 100vh` and stretching children.  See
    // https://coda.io/d/Plasmic-Wiki_dHQygjmQczq/Scaffolding-to-render-full-viewport-components_su2po#_luKso
    const useCssModules = ctx.exportOpts.stylesOpts?.scheme === "css-modules";
    renderBody = `
      <div className={${
        useCssModules
          ? `projectcss.plasmic_page_wrapper`
          : jsLiteral("plasmic_page_wrapper")
      }}>
        ${makeChildrenStr([renderBody])}
      </div>
    `;
  }

  const pageContent = `<React.Fragment>
  ${makeChildrenStr([
    ...(ctx.exportOpts.platform === "nextjs"
      ? [`<Head>${renderPageHead(ctx, page)}</Head>`]
      : []),
    renderFullViewportStyle(ctx),
    renderBody,
  ])}
</React.Fragment>`;

  return pageContent;
}

export function getUsedGlobalVariantGroups(
  site: Site,
  component: Component,
  projectFlags: DevFlagsType
) {
  return new Set([
    ...getReferencedVariantGroups(
      extractUsedGlobalVariantsForComponents(
        site,
        [component],
        projectFlags.usePlasmicImg
      )
    ),
    ...getReferencedVariantGroups(
      extractUsedGlobalVariantsForTokens(
        extractUsedTokensForTheme(
          site,
          allStyleTokensDict(site, { includeDeps: "all" }),
          { derefTokens: true }
        )
      )
    ),
  ]);
}

function serializeInitFunc(
  state: State,
  ctx: SerializerBaseContext,
  isForRegisterInitFunc?: boolean
) {
  let initFunc: undefined | string = undefined;
  if (
    state.tplNode &&
    ancestorsUp(state.tplNode).filter(isTplRepeated).length > 0 &&
    !isForRegisterInitFunc
  ) {
    return undefined;
  }
  const exprCtx = ctx.exprCtx;
  if (!state.tplNode && state.variableType === "variant") {
    initFunc = `({$props, $state, $queries, $ctx}) => (${
      state.param.defaultExpr
        ? getRawCode(state.param.defaultExpr, exprCtx) + " ?? "
        : ""
    } $props.${getStateValuePropName(state)})`;
  } else if (!state.tplNode && state.param.defaultExpr) {
    initFunc = `({$props, $state, $queries, $ctx}) => (${getRawCode(
      state.param.defaultExpr,
      exprCtx
    )})`;
  } else if (state.tplNode) {
    const tpl = state.tplNode;
    const exprs: [string, VariantCombo][] = [];
    for (const vs of getOrderedExplicitVSettings(ctx, tpl)) {
      if (isTplComponent(tpl)) {
        const arg = vs.args.find(
          (vsArg) => vsArg.param === state.implicitState?.param
        );
        if (arg) {
          exprs.push([getRawCode(arg.expr, exprCtx), vs.variants]);
        }
      } else if (isTplTag(tpl)) {
        const namedState = ensureKnownNamedState(state);
        const varName = toVarName(namedState.name);
        if (varName in vs.attrs) {
          exprs.push([getRawCode(vs.attrs[varName], exprCtx), vs.variants]);
        }
      }
    }
    const baseVariant = ensureBaseVariant(ctx.component);
    if (
      state.implicitState &&
      isWritableState(state.implicitState) &&
      !exprs.some(([_expr, variantCombo]) =>
        arrayEq(variantCombo, [baseVariant])
      )
    ) {
      const initExpr = getVirtualWritableStateInitialValue(state);
      if (initExpr) {
        exprs.unshift([getRawCode(initExpr, exprCtx), [baseVariant]]);
      }
    }
    if (
      isTplCodeComponent(tpl) &&
      state.implicitState &&
      isReadonlyState(state.implicitState) &&
      state.implicitState?.param.defaultExpr
    ) {
      // initializing readonly state from code commponents
      // writable states are initialized with the value prop
      exprs.unshift([
        getRawCode(state.implicitState.param.defaultExpr, exprCtx),
        [baseVariant],
      ]);
    }
    initFunc = `({$props, $state, $queries${
      !isForRegisterInitFunc ? ", $ctx" : ""
    }}) => (${
      joinVariantVals(exprs, ctx.variantComboChecker, "undefined").value
    })`;
  }
  if (
    !initFunc ||
    (isWritableState(state) && !ctx.exportOpts.shouldTransformWritableStates)
  ) {
    return undefined;
  } else if (isWritableState(state)) {
    return `$props["${makePlasmicIsPreviewRootComponent()}"] ? ${initFunc} : undefined`;
  } else {
    return initFunc;
  }
}

function serializeStateSpecs(component: Component, ctx: SerializerBaseContext) {
  const serializeState = (state: State) => {
    const initFunc = serializeInitFunc(state, ctx);

    let valueProp = ``;
    if (
      !ctx.exportOpts.shouldTransformWritableStates &&
      isWritableState(state)
    ) {
      valueProp = `valueProp: "${getStateValuePropName(state)}",`;
    } else if (
      ctx.exportOpts.shouldTransformWritableStates &&
      isWritableState(state)
    ) {
      valueProp = `...(!$props["${makePlasmicIsPreviewRootComponent()}"]
        ? { valueProp: "${getStateValuePropName(state)}" }
        : { }
      ),`;
    }

    const { nodeNamer } = ctx;
    const codeComponentHelperName =
      state.tplNode &&
      isTplComponent(state.tplNode) &&
      isCodeComponentWithHelpers(state.tplNode.component)
        ? getImportedCodeComponentHelperName(
            ctx.aliases,
            state.tplNode.component
          )
        : "undefined";

    return `{
      path: "${getStateVarName(state)}",
      type: ${
        !ctx.exportOpts.shouldTransformWritableStates || !isWritableState(state)
          ? `"${state.accessType}"`
          : `$props["${makePlasmicIsPreviewRootComponent()}"] ? "private" : "writable"`
      },
      variableType: "${state.variableType}",
      ${initFunc ? `initFunc: ${initFunc},` : ""}
      ${valueProp}
      ${
        state.onChangeParam.exportType !== ParamExportType.ToolsOnly
          ? `onChangeProp: "${getStateOnChangePropName(state)}",`
          : ``
      }
      ${
        state.tplNode &&
        isTplComponent(state.tplNode) &&
        tplHasRef(state.tplNode)
          ? `refName: ${jsLiteral(nodeNamer(state.tplNode))},`
          : ``
      }
      ${
        state.tplNode &&
        isTplComponent(state.tplNode) &&
        isCodeComponentWithHelpers(state.tplNode.component)
          ? `onMutate: generateOnMutateForSpec("${
              ensureKnownNamedState(state.implicitState).name
            }", ${codeComponentHelperName})`
          : ``
      }
    }`;
  };

  return `[${component.states
    .filter((state) => !state.tplNode || !ctx.fakeTpls.includes(state.tplNode))
    .map((state) => serializeState(state))
    .join(",")}]`;
}

function serializeComponentLevelQuery(
  query: ComponentDataQuery,
  ctx: SerializerBaseContext
) {
  if (!query.op) {
    return "";
  }
  // We use the "no fallback" version of query.op, and catch the
  // null reference errors here ourselves. This is so that if
  // there's a null error, we want to make sure we don't perform
  // the data operation until there is no null error; relying on
  // fallback would mean performing the data operation with null
  // userArgs, which are likely invalid.
  return `usePlasmicDataOp(
    (() => { return ${getRawCode(
      removeFallbackFromDataSourceOp(query.op),
      ctx.exprCtx
    )};
    })
  )`;
}

function serializeRenderFunc(
  ctx: SerializerBaseContext,
  referencedComponents: Component[]
) {
  const { component } = ctx;

  const root = component.tplTree;
  const componentSubstitutionCalls = ctx.exportOpts.useComponentSubstitutionApi
    ? generateSubstituteComponentCalls(
        referencedComponents,
        ctx.exportOpts,
        ctx.aliases
      )
    : [];
  const codeComponentHelpers = ctx.exportOpts.useCodeComponentHelpersRegistry
    ? generateCodeComponentsHelpersFromRegistry(
        referencedComponents,
        ctx.aliases,
        ctx.exportOpts
      )
    : [];

  let renderBody = ctx.serializeTplNode(ctx, root);
  if (isPageComponent(component)) {
    renderBody = renderPage(ctx, component, renderBody);
  }

  if (component.subComps.length > 0) {
    renderBody = `
      <${makePlasmicSuperContextName(
        component
      )}.Provider value={{variants, args}}>
        ${renderBody}
      </${makePlasmicSuperContextName(component)}.Provider>
    `;
  }

  const serializedArgs = serializeArgsDefaultValues(ctx);

  const argsDependencyArray =
    serializedArgs.includes("$translator") &&
    ctx.projectFlags.usePlasmicTranslation
      ? `[props.args, $translator]`
      : `[props.args]`;

  return `
    function ${makeRenderFuncName(component)}(
      props: {
        variants: ${makeVariantsArgTypeName(component)},
        args: ${makeArgsTypeName(component)},
        overrides: ${makeOverridesTypeName(component)},
        forNode?: string
      }
    ) {
      ${
        ctx.exportOpts.useComponentSubstitutionApi
          ? componentSubstitutionCalls.join("\n")
          : ""
      }
      ${
        ctx.exportOpts.useCodeComponentHelpersRegistry
          ? codeComponentHelpers.join("\n")
          : ""
      }
      const {variants, overrides, forNode } = props;

      ${
        ctx.projectFlags.usePlasmicTranslation
          ? `const $translator = usePlasmicTranslator?.();`
          : ""
      }

      const args = React.useMemo(() => Object.assign(${serializedArgs}, props.args),
        ${argsDependencyArray}
      );

      ${serializeComponentLocalVars(ctx)}
      return (
        ${renderBody}
      ) as React.ReactElement | null;
    }`;
}

/**
 * Defines all the local variables used within the component render function, shared
 * between plain and blackbox schemes.
 *
 * Expects `variants` and `args` to already be in scope.
 */
export function serializeComponentLocalVars(ctx: SerializerBaseContext) {
  const { component } = ctx;

  const treeTriggers = serializeLocalStyleTriggers(ctx);
  const ccInteractionTriggers = serializeInteractionVariantsTriggers(
    component.tplTree
  );
  const globalTriggers = serializeGlobalVariantValues(
    ctx.usedGlobalVariantGroups
  );
  const superComps = getSuperComponents(component);
  const dataQueries = component.dataQueries.filter((q) => !!q.op);
  return `
    const $props = {
      ...args,
      ...variants,
    };

    ${
      ctx.exportOpts.platform === "nextjs"
        ? `const __nextRouter = useNextRouter();`
        : ""
    }
    const $ctx = useDataEnv?.() || {};
    const refsRef = React.useRef({});
    const $refs = refsRef.current;

    ${
      ctx.usesGlobalActions
        ? `const $globalActions = useGlobalActions?.();`
        : ""
    }

    ${
      ctx.appAuthProvider ? `const currentUser = useCurrentUser?.() || {};` : ""
    }

    ${
      ctx.usesComponentLevelQueries
        ? `let [$queries, setDollarQueries] = React.useState<Record<string, ReturnType<typeof usePlasmicDataOp>>>({});`
        : ""
    }
    ${
      component.states.length
        ? `const stateSpecs: Parameters<typeof useDollarState>[0] = React.useMemo(() =>
          (${serializeStateSpecs(component, ctx)})
        , [$props, $ctx, $refs]);
        const $state = useDollarState(stateSpecs, {$props, $ctx, $queries: ${
          ctx.usesComponentLevelQueries ? "$queries" : "{}"
        }, $refs});`
        : ""
    }
    ${
      ctx.usesDataSourceInteraction || ctx.usesLoginInteraction
        ? `const dataSourcesCtx = usePlasmicDataSourceContext();`
        : ""
    }
    ${
      ctx.usesDataSourceInteraction
        ? `const plasmicInvalidate = usePlasmicInvalidate();`
        : ""
    }

    ${
      // We put this here so the expressions have access to $state
      ctx.usesComponentLevelQueries
        ? `
      const new$Queries: Record<string, ReturnType<typeof usePlasmicDataOp>> = {
        ${dataQueries
          .map(
            (q) =>
              `${toVarName(q.name)}: (${serializeComponentLevelQuery(q, ctx)})`
          )
          .join(",\n")}
      };
      if (Object.keys(new$Queries).some(k => new$Queries[k] !== $queries[k])) {
        setDollarQueries(new$Queries);
        ${
          // We also update `$queries` to `new$Queries` immediately here, so that
          // the rendering code below will make use of `$queries` immediately.
          // Otherwise, `$queries` is just an empty object, and even though we
          // will trigger an immediate re-render with the `setDollarQueries()`
          // above, we will still finish rendering this pass, which may result
          // in errors referencing `$queries` as an empty object.  We _will_
          // still re-render, and that's still valuable because that's when `$state`
          // will be re-initialized with the proper `$queries`, if it referenced
          // `$queries` at all in any state initialization.
          ""
        }
        $queries = new$Queries;
      }
    `
        : ""
    }

    ${
      component.superComp
        ? `
  const superContexts = {
    ${superComps
      .map(
        (superComp) =>
          `${getExportedComponentName(
            superComp
          )}: React.useContext(SUPER__${makePlasmicComponentName(
            superComp
          )}.Context)`
      )
      .join(",\n")}
  };
`
        : ""
    }

    ${treeTriggers}
    ${globalTriggers}
    ${ccInteractionTriggers}
  `;
}

export function serializeLocalStyleTriggers(ctx: SerializerBaseContext) {
  const { reactHookSpecs } = ctx;
  // These are the trigger states for unnamed descendants of this node
  const uniqTriggeredHookSpecs = L.uniqBy(reactHookSpecs, (s) => s.hookName);
  if (uniqTriggeredHookSpecs.length === 0) {
    return "";
  }

  return `
      ${L.uniq(
        uniqTriggeredHookSpecs.flatMap((spec) => spec.getTriggerHooks())
      ).join("\n")}
      const triggers = {
        ${uniqTriggeredHookSpecs
          .map((spec) => `${spec.hookName}: ${spec.getTriggerBooleanExpr()}`)
          .join(",\n")}
      };
      `;
}

export function serializeInteractionVariantsTriggers(tplRoot: TplNode) {
  if (!isTplRootWithCodeComponentInteractionVariants(tplRoot)) {
    return "";
  }

  const interactionVariantKeys = Object.keys(
    tplRoot.component.codeComponentMeta.interactionVariantMeta
  );

  return `
    const [$ccInteractions, setDollarCcInteractions] = React.useState<Record<string, boolean>>({
      ${interactionVariantKeys.map((key) => `${key}: false`).join(",\n")}
    });
    const updateInteractionVariant = React.useCallback((changes: Record<string, boolean>) => {
      setDollarCcInteractions((prev) => {
        if (!Object.keys(changes).some((k) => prev[k] !== changes[k])) {
          return prev;
        }
        return { ...prev, ...changes }
      });
    }, []);
  `;
}

/**
 * Outputs code that renders the argument `node`.
 */
function serializeTplNode(ctx: SerializerBaseContext, node: TplNode): string {
  if (isTplTag(node)) {
    return serializeTplTag(ctx, node);
  } else if (isTplComponent(node)) {
    return serializeTplComponent(ctx, node);
  } else if (isTplSlot(node)) {
    return serializeTplSlot(ctx, node);
  } else {
    throw new Error(`Unexpected TplNode ${summarizeTpl(node)}`);
  }
}

export function makeCssClassNameForVariantCombo(
  variantCombo: Variant[],
  opts: {
    targetEnv: TargetEnv;
    prefix?: string;
    superComp?: Component;
  }
) {
  const isBase = isBaseVariant(variantCombo);
  if (isBase || variantCombo.length == 0) {
    return "";
  }
  const { targetEnv, prefix, superComp } = opts;

  variantCombo = sortBy(variantCombo, (v) => v.uuid);
  return `${prefix ?? ""}${variantCombo
    .map((variant) => {
      if (targetEnv === "loader") {
        return variant.uuid.slice(0, 5);
      }
      const variantName = toJsIdentifier(variant.name);
      if (!variant.parent) {
        if (!variant.selectors?.length) {
          throw new Error(
            "Error naming variant. Requires either a parent or non-empty list of selectors."
          );
        }
        return `${variantName}__${variant.selectors
          .map((selector) => toJsIdentifier(selector))
          .join("__")}`;
      }

      const group = variant.parent;
      const isStandalone = isStandaloneVariantGroup(group);
      let parentName = toJsIdentifier(group.param.variable.name);
      if (
        superComp &&
        superComp.variantGroups.includes(group as ComponentVariantGroup)
      ) {
        parentName = `${toClassName(superComp.name)}__${parentName}`;
      }

      switch (variant.parent.type) {
        default:
          throw new Error("Unknown variant group");
        case VariantGroupType.Component:
          return isStandalone ? parentName : `${parentName}_${variantName}`;
        case VariantGroupType.GlobalScreen:
        case VariantGroupType.GlobalUserDefined:
          return isStandalone
            ? `global_${parentName}`
            : `global_${parentName}_${variantName}`;
      }
    })
    .join("_")}`;
}

function makeCssClassName(
  component: Component,
  node: TplNode,
  vs: VariantSetting,
  nodeNamer: NodeNamer,
  opts: {
    targetEnv: TargetEnv;
    useSimpleClassname?: boolean;
  }
) {
  const nodeName = nodeNamer(node);
  const namePart = nodeName
    ? toJsIdentifier(nodeName)
    : toJsIdentifier(summarizeTpl(node));
  const { targetEnv, useSimpleClassname } = opts;

  // We only need to include base rule variants in the class name, as
  // non-base-rule variants are invoked via mediaQuery or css selectors
  // instead.
  const variants = vs.variants.filter((v) => isBaseRuleVariant(v));

  const isBase = isBaseVariant(variants);
  const variantPart = makeCssClassNameForVariantCombo(variants, {
    targetEnv,
    superComp: component.superComp ?? undefined,
  });

  const uniqId = toJsIdentifier(
    `${node.uuid.substring(0, 5)}${
      isBase
        ? ""
        : sortBy(variants, (v) => v.uuid)
            .map((v) => v.uuid.substring(0, 5))
            .join("_")
    }`
  );

  // We don't use a unique ID only if there's a node name, and useSimpleClassname
  // is true.
  const idPart = nodeName && useSimpleClassname ? "" : `__${uniqId}`;

  const localClassName = `${namePart}${variantPart}${idPart}`;
  if (targetEnv === "loader") {
    // Use shortest unique id possible
    return `${shortPlasmicPrefix}${uniqId}`;
  }
  return useSimpleClassname
    ? localClassName
    : `${getExportedComponentName(component)}__${localClassName}`;
}

function shouldGenVariant(ctx: SerializerBaseContext, v: Variant) {
  const vg = v.parent;
  return (
    !vg ||
    ctx.exportOpts.forceAllProps ||
    vg.param.exportType !== ParamExportType.ToolsOnly
  );
}

function shouldGenVariantSetting(
  ctx: SerializerBaseContext,
  vs: VariantSetting
) {
  return (
    isActiveVariantSetting(ctx.site, vs) &&
    vs.variants.every((v) => shouldGenVariant(ctx, v))
  );
}

function shouldReferenceByClassName(vs: VariantSetting) {
  // If there are variants in the combo that are not base rule variants, like
  // :hover, then we don't need to reference this VariantSetting by name
  // in className; instead, it'll be triggered by generated css selectors.
  return vs.variants.every((v) => isBaseRuleVariant(v));
}

const makeCssClassExprsForVariantedTokens = (ctx: SerializerBaseContext) => {
  const { component, variantComboChecker } = ctx;
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  const unconditionalClassExprs: string[] = [];
  const conditionalClassExprs: [string, string][] = [];

  const cssProjectDependencies = L.uniqBy(
    ctx.siteCtx.cssProjectDependencies,
    "projectName"
  );

  unconditionalClassExprs.push(
    useCssModules
      ? `projectcss.${makePlasmicDefaultStylesClassName(ctx.exportOpts)}`
      : jsLiteral(makePlasmicDefaultStylesClassName(ctx.exportOpts))
  );

  unconditionalClassExprs.push(
    useCssModules
      ? `projectcss.${makePlasmicMixinsClassName(ctx.exportOpts)}`
      : jsLiteral(makePlasmicMixinsClassName(ctx.exportOpts))
  );

  unconditionalClassExprs.push(
    useCssModules
      ? `projectcss.${makePlasmicTokensClassName(ctx.exportOpts)}`
      : jsLiteral(makePlasmicTokensClassName(ctx.exportOpts))
  );
  unconditionalClassExprs.push(
    ...withoutNils(
      cssProjectDependencies.map((dep) =>
        useCssModules
          ? `${makeCssProjectImportName(
              dep.projectName
            )}.${makePlasmicTokensClassName(ctx.exportOpts)}`
          : undefined
      )
    )
  );

  const tokens = new Set([
    ...extractUsedTokensForComponents(ctx.site, [component], {
      expandMixins: true,
      derefTokens: true,
    }),
    ...ctx.componentGenHelper.siteHelper.usedTokensForTheme(),
  ]);

  const globalVariantCombos = extractUsedGlobalVariantCombosForTokens(
    ctx.site,
    tokens
  );
  // Screen variants are rendered through media query
  const nonScreenGlobalVariantCombos = Array.from(globalVariantCombos)
    .map((vc) => vc.filter((v) => !isScreenVariant(v)))
    .filter((vc) => vc.length > 0);
  if (nonScreenGlobalVariantCombos.length > 0) {
    const sorter = makeGlobalVariantComboSorter(ctx.site);
    sortedVariantCombos(nonScreenGlobalVariantCombos, sorter).forEach((vc) => {
      let comboClassNameExpr: string;
      if (useCssModules) {
        // If we're using css modules, we need to make sure we reference
        // the right css import
        const depMap = ctx.componentGenHelper.siteHelper.objToDepMap();
        assert(
          vc.length === 1,
          "Can only build varianted combos with one variant"
        );
        const variant = vc[0];
        const variantGroup = ensure(
          variant.parent,
          "Global variants always have parent group"
        );
        const variantDep = depMap.get(variantGroup);
        const importName = variantDep
          ? makeCssProjectImportName(variantDep.name)
          : "projectcss";
        comboClassNameExpr = `[${importName}.${makeCssClassNameForVariantCombo(
          vc,
          { targetEnv: ctx.exportOpts.targetEnv }
        )}]`;
      } else {
        comboClassNameExpr = jsLiteral(
          `${makeCssClassNameForVariantCombo(vc, {
            targetEnv: ctx.exportOpts.targetEnv,
          })}`
        );
      }
      conditionalClassExprs.push(
        tuple(comboClassNameExpr, variantComboChecker(vc, true))
      );
    });
  }

  return { unconditionalClassExprs, conditionalClassExprs };
};

function serializeClassNames(
  ctx: SerializerBaseContext,
  node: TplNode,
  orderedVsettings: VariantSetting[],
  additionalClassExpr?: string[]
) {
  const { component, nodeNamer, variantComboChecker } = ctx;
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  const unconditionalClassExprs: string[] = [];
  const conditionalClassExprs: [string, string][] = [];

  const entry = interpreterMeta
    ? (interpreterMeta.nodeUuidToClassNames[node.uuid] = interpreterMeta
        .nodeUuidToClassNames[node.uuid] ?? {
        unconditionalClasses: [],
        conditionalClasses: [],
      })
    : {
        unconditionalClasses: [],
        conditionalClasses: [],
      };

  // It is important that the "base" styles, like defaultcss and projectcss,
  // are used first, because when you build css modules, they css rules will
  // be ordered by usage first (rather than import first)
  if (isTplTag(node)) {
    const tag = shouldUsePlasmicImg(node, ctx.projectFlags)
      ? "PlasmicImg"
      : node.tag;
    const defaultClassnames = useCssModules
      ? tag === "PlasmicImg"
        ? []
        : withoutNils([
            "all",
            hasClassnameOverride(node.tag) ? node.tag : undefined,
          ])
      : defaultStyleClassNames(
          makeDefaultStyleClassNameBase(ctx.exportOpts),
          tag
        );

    for (const name of defaultClassnames) {
      if (useCssModules) {
        unconditionalClassExprs.push(`projectcss.${name}`);
      } else {
        unconditionalClassExprs.push(jsLiteral(name));
      }
    }

    if (isTplTextBlock(node)) {
      unconditionalClassExprs.push(
        useCssModules
          ? `projectcss.${makeWabTextClassName(ctx.exportOpts)}`
          : jsLiteral(makeWabTextClassName(ctx.exportOpts))
      );
    }

    if (isTplTextBlock(node.parent) && isTagInline(node.tag)) {
      unconditionalClassExprs.push(
        useCssModules
          ? `projectcss.${makeDefaultInlineClassName(ctx.exportOpts)}`
          : jsLiteral(makeDefaultInlineClassName(ctx.exportOpts))
      );
    }
  } else if (isTplComponent(node)) {
    unconditionalClassExprs.push(
      jsLiteral(makeWabInstanceClassName(ctx.exportOpts))
    );
  }

  if (
    node === component.tplTree &&
    (isTplTag(node) || isTplCodeComponent(node))
  ) {
    // For root nodes of tag or code TplComponent, we tack on the root reset
    // classes. We don't need to do so for "plasmic" TplComponent because
    // _its_ root will have the root reset classes.
    const rootExprs = serializeComponentRootResetClasses(ctx, false);
    unconditionalClassExprs.push(...rootExprs.unconditionalClassExprs);
    conditionalClassExprs.push(...rootExprs.conditionalClassExprs);
  }

  for (const vs of orderedVsettings) {
    if (!shouldReferenceByClassName(vs)) {
      continue;
    }
    const generatedClass = makeCssClassName(component, node, vs, nodeNamer, {
      targetEnv: ctx.exportOpts.targetEnv,
      useSimpleClassname: useCssModules,
    });
    if (isBaseVariant(vs.variants)) {
      unconditionalClassExprs.push(
        useCssModules ? `sty.${generatedClass}` : jsLiteral(generatedClass)
      );
    } else {
      const key = useCssModules
        ? `[sty.${generatedClass}]`
        : jsLiteral(generatedClass);
      entry.conditionalClasses.push([key, vs.variants.map((v) => v.uuid)]);
      conditionalClassExprs.push(
        tuple(key, variantComboChecker(vs.variants, true))
      );
    }
  }

  if (additionalClassExpr) {
    unconditionalClassExprs.push(...withoutNils(additionalClassExpr));
  }

  entry.unconditionalClasses.push(...unconditionalClassExprs);

  return serializeClassNamesCall(
    unconditionalClassExprs,
    conditionalClassExprs
  );
}

function serializeClassNamesCall(
  unconditionalClassExprs: string[],
  conditionalClassExprs: [string, string][]
) {
  const hasUnconditionals = unconditionalClassExprs.length > 0;
  const hasConditionals = conditionalClassExprs.length > 0;
  return `classNames(${unconditionalClassExprs.join(", ")}${
    hasUnconditionals && hasConditionals ? ", " : ""
  }${hasConditionals ? sortedDict(conditionalClassExprs) : ""})`;
}

function serializeComponentRootResetClasses(
  ctx: SerializerBaseContext,
  includeTagStyles: boolean
) {
  const unconditionalClassExprs: string[] = [];
  const conditionalClassExprs: [string, string][] = [];
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  const resetName = makeRootResetClassName(ctx.projectConfig.projectId, {
    targetEnv: ctx.exportOpts.targetEnv,
    useCssModules,
  });
  unconditionalClassExprs.push(
    useCssModules ? `projectcss.${resetName}` : jsLiteral(resetName)
  );

  if (includeTagStyles) {
    unconditionalClassExprs.push(
      useCssModules
        ? `projectcss.${resetName}_tags`
        : jsLiteral(`${resetName}_tags`)
    );
  }

  const tokenClassExprs = makeCssClassExprsForVariantedTokens(ctx);
  unconditionalClassExprs.push(...tokenClassExprs.unconditionalClassExprs);
  conditionalClassExprs.push(...tokenClassExprs.conditionalClassExprs);

  return {
    conditionalClassExprs,
    unconditionalClassExprs,
  };
}

/**
 * Returns the list of VariantSettings for `node`, a child of `component`, that
 * should be explicitly checked for by a VariantChecker.  This includes
 * all non-style variants that are of export type Internal and External, as
 * well as style variants that require a react hook.
 */
export function getOrderedExplicitVSettings(
  ctx: SerializerBaseContext,
  node: TplNode
) {
  const vsettings = ctx.componentGenHelper.getSortedVSettings(node);
  const res = vsettings.filter(
    (vs) =>
      shouldGenVariantSetting(ctx, vs) &&
      (!hasStyleVariant(vs.variants) ||
        shouldGenReactHook(vs, ctx.component) ||
        isTplRootWithCodeComponentInteractionVariants(ctx.component.tplTree))
  );
  if (interpreterMeta) {
    interpreterMeta.nodeUuidToOrderedVsettings[node.uuid] =
      interpreterMeta.nodeUuidToOrderedVsettings[node.uuid] ??
      res.map((vs) => vs.variants.map((v) => v.uuid));
  }
  return res;
}

// Important: If we change the generated strings we need to update
// `resolveRichTextToDummyElt` in `shared/localization.tsx` as well :/
function resolveRichTextToJsx(
  ctx: SerializerBaseContext,
  text: RichText | null | undefined
) {
  if (!text) {
    return { content: "", isDynamic: false };
  }

  if (isKnownExprText(text)) {
    assert(
      isKnownCustomCode(text.expr) || isKnownObjectPath(text.expr),
      "Expected CustomCode or ObjectPath expr"
    );
    const textCode = getCodeExpressionWithFallback(text.expr, ctx.exprCtx);
    const className =
      ctx.exportOpts.stylesOpts.scheme === "css-modules"
        ? `projectcss.${makeWabHtmlTextClassName(ctx.exportOpts)}`
        : jsLiteral(makeWabHtmlTextClassName(ctx.exportOpts));
    const code = text.html
      ? `<div className={${className}} dangerouslySetInnerHTML={{ __html: ${textCode} }} />`
      : `<React.Fragment>{${textCode}}</React.Fragment>`;
    return {
      content: code,
      isDynamic: true,
    };
  }

  assert(isKnownRawText(text), "Expected RawText expr");

  const richTextRoot = !ctx.insideRichTextBlock;

  if (text.markers.length === 0) {
    const content = ctx.exportOpts.whitespaceNormal
      ? `<React.Fragment>${plainTextToReact(text.text)}</React.Fragment>`
      : jsLiteral(cleanPlainText(text.text));
    return { content, isDynamic: false };
  }

  const normalizedMarkers = normalizeMarkers(text.markers, text.text.length);

  const spanClassName = defaultStyleClassNames(
    makeDefaultStyleClassNameBase(ctx.exportOpts),
    "span"
  ).join(" ");

  const children: string[] = [];
  ctx.insideRichTextBlock = true;

  for (let i = 0; i < normalizedMarkers.length; i++) {
    const marker = normalizedMarkers[i];
    if (marker.type === "nodeMarker") {
      children.push(`{${ctx.serializeTplNode(ctx, marker.tpl)}}`);
    } else {
      const cssRules =
        marker.type === "styleMarker" ? getCssRulesFromRs(marker.rs, true) : {};

      // If the previous marker was a block-level element, we must remove one
      // line break from the beginning of the text so `white-space: pre-wrap`
      // will not print an unwanted line break.
      const prevMarker = i > 0 ? normalizedMarkers[i - 1] : undefined;
      const textPart = text.text.substr(marker.position, marker.length);
      const removeInitialLineBreak =
        prevMarker?.type === "nodeMarker" &&
        isTplTag(prevMarker.tpl) &&
        !isTagInline(prevMarker.tpl.tag);
      const plainText = ctx.exportOpts.whitespaceNormal
        ? plainTextToReact(textPart, removeInitialLineBreak)
        : "{" +
          jsLiteral(cleanPlainText(textPart, removeInitialLineBreak)) +
          "}";

      if ("fontWeight" in cssRules) {
        // fontWeight is typed as a number
        cssRules["fontWeight"] = parseInt(cssRules["fontWeight"]) as any;
      }

      if (L.isEmpty(cssRules)) {
        children.push(`<React.Fragment>${plainText}</React.Fragment>`);
      } else {
        // We make sure these spans also have the default class names, so they properly
        // override any global styles for span.
        children.push(
          `<span className={"${spanClassName}"} style={${JSON.stringify(
            cssRules
          )}}>${plainText}</span>`
        );
      }
    }
  }
  if (richTextRoot) {
    ctx.insideRichTextBlock = false;
  }

  const content = `<React.Fragment>${children.join("")}</React.Fragment>`;
  return {
    content,
    isDynamic: false,
  };
}

function serializeLocalizationKey(ctx: SerializerBaseContext, tpl: TplTextTag) {
  const keyScheme = ctx.exportOpts.localization?.keyScheme ?? "content";
  if (keyScheme === "content") {
    return undefined;
  }

  const { site, component, variantComboSorter, variantComboChecker } = ctx;

  const combos = extractAllVariantCombosForText(component, tpl);

  const opts: LocalizationConfig = {
    keyScheme,
    tagPrefix: ctx.exportOpts.localization?.tagPrefix,
  };
  const comboValues: [string, VariantCombo][] = combos.map((combo) => [
    jsLiteral(
      makeLocalizationStringKey(
        genLocalizationString(site, tpl, combo, variantComboSorter, opts),
        {
          type: "text",
          projectId: ctx.projectConfig.projectId as ProjectId,
          site,
          component,
          tpl,
          variantCombo: combo,
        },
        opts
      )
    ),
    combo,
  ]);

  const baseValue = ensure(
    comboValues.find(([_str, combo]) => isBaseVariant(combo)),
    `There must be a base variant`
  )[0];

  const nonBaseValues = comboValues.filter(
    ([_str, combo]) => !isBaseVariant(combo)
  );

  return joinVariantVals(nonBaseValues, variantComboChecker, baseValue).value;
}

export function serializeTplTextBlockContent(
  ctx: SerializerBaseContext,
  node: TplTextTag,
  orderedVsettings: VariantSetting[]
) {
  const { variantComboChecker } = ctx;
  const textSettings = orderedVsettings.filter((vs) => !!vs.text);
  const useTranslation = ctx.projectFlags.usePlasmicTranslation;
  const transKey =
    useTranslation && isLocalizableTextBlock(node)
      ? memoizeOne(() => serializeLocalizationKey(ctx, node))
      : undefined;

  const rawStringAndVariants = textSettings.map((vs) => {
    const res = resolveRichTextToJsx(ctx, vs.text);
    return tuple(res.content || "", vs.variants);
  });
  const r = joinVariantVals(
    rawStringAndVariants.map(([rawString, variants]) =>
      tuple(rawString, variants)
    ),
    variantComboChecker,
    jsString("")
  );

  let value = r.value;
  if (useTranslation && transKey && !ctx.insideRichTextBlock) {
    value = `<Trans__${
      transKey() ? ` transKey={${transKey()}}` : ""
    }>{${value}}</Trans__>`;
  }
  // This is the raw string value when the value is unconditional.
  const rawUncondValue =
    r.indexOfUncondValue >= 0
      ? rawStringAndVariants[r.indexOfUncondValue][0]
      : "";
  return {
    value,
    conditional: r.conditional,
    rawUncondValue,
  };
}

export interface SerializerSiteContext {
  projectFlags: DevFlagsType;
  cssProjectDependencies: CssProjectDependencies;
  cssVarResolver: CssVarResolver;
}

export interface SerializerBaseContext {
  componentGenHelper: ComponentGenHelper;
  nodeNamer: NodeNamer;
  site: Site;
  siteCtx: SerializerSiteContext;
  component: Component;
  reactHookSpecs: ReactHookSpec[];
  projectConfig: ProjectConfig;
  usedGlobalVariantGroups: Set<VariantGroup>;
  variantComboChecker: VariantComboChecker;
  variantComboSorter: VariantComboSorter;
  directCodeGenConfig?: {
    // When the children of an element or component instance is a single string,
    // should we evaluate them in the helper class where
    // args/variants/triggerState/globalVariants are referenced as
    // "this.args"/"this.variants"/"this.triggerState"/"this.globalVariants".
    evalSingleStringChildrenInHelper: boolean;
  };
  exportOpts: ExportOpts;
  aliases: ImportAliasesMap;
  markTpl?: TplNode;
  s3ImageLinks: Record<string, string>;
  projectFlags: DevFlagsType;
  cssVarResolver: CssVarResolver;
  insideRichTextBlock?: boolean;
  usesDataSourceInteraction?: boolean;
  usesLoginInteraction?: boolean;
  usesGlobalActions?: boolean;
  usesComponentLevelQueries?: boolean;
  cache: Record<string, DeepMap<any>>;
  forceAllCsr: boolean;
  appAuthProvider?: AppAuthProvider;
  isPlasmicHosted?: boolean;
  serializeTplNode: (ctx: SerializerBaseContext, node: TplNode) => string;
  exprCtx: ExprCtx;
  /**
   * These tpls only exist during codegen for certain improvements in the user-generated code.
   * Because of this, they do not accept certain props/attrs that are passed to other plasmic tpls,
   * such as overrides and implicit states."
   */
  fakeTpls: TplNode[];
  /**
   * Depending on certain conditions, we can modify the import path of certain hostless components
   * to improve the user-generated code. For instance, we can make simplified forms tree-shakable by
   * importing a simpler form component instead of the full form component for schema forms.
   */
  replacedHostlessComponentImportPath: Map<Component, string>;
}

export type ImportAliasesMap = Map<Component | ImageAsset, string>;

export const maybeCondExpr = (maybeCond: string, expr: string) => {
  if (!maybeCond) {
    return expr;
  }
  return `(${maybeCond}) ? (${expr}) : null`;
};

function shouldUsePlasmicImg(node: TplTag, projectFlags: DevFlagsType) {
  return node.tag === "img" && projectFlags.usePlasmicImg;
}

export function serializeTplTagBase(
  ctx: SerializerBaseContext,
  node: TplTag,
  opts?: {
    additionalClassExprs?: string[];
  }
) {
  const { component, reactHookSpecs, variantComboChecker } = ctx;
  const orderedVsettings = getOrderedExplicitVSettings(ctx, node);

  const attrs = conditionalTagAttrs(ctx, node, orderedVsettings);
  let wrapFlexChild = "false";
  if (!isTplTextBlock(node)) {
    // See whether any VariantSettings flex-gap wrapping
    if (
      ctx.componentGenHelper.hasGapStyle(node) &&
      !ctx.exportOpts.stylesOpts.useCssFlexGap
    ) {
      wrapFlexChild = "true";
    }
  }

  attrs["className"] = serializeClassNames(ctx, node, orderedVsettings, [
    attrs["className"],
    ...(opts?.additionalClassExprs ?? []),
  ]);

  if (node.type === TplTagType.Image && node.tag !== "img") {
    // Only set role=img for svg,
    // per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/Role_Img#svg_and_roleimg
    // It is incorrect to do so for img tag.
    attrs["role"] = codeLit("img").code;
  }

  if (node === component.tplTree && ctx.exportOpts.forceRootDisabled) {
    attrs["disabled"] = `true`;
  }

  const triggeredHooks = reactHookSpecs.filter(
    (spec) => spec.triggerNode === node
  );

  let tag = node.tag;

  if (isTplImage(node) && node.tag === "svg") {
    const iconRefs = orderedVsettings
      .filter(
        (vs) =>
          vs.attrs["outerHTML"] && isKnownImageAssetRef(vs.attrs["outerHTML"])
      )
      .map((vs) => tuple(vs.attrs["outerHTML"] as ImageAssetRef, vs.variants));
    if (iconRefs.length === 1 && !!iconRefs[0][0].asset.dataUri) {
      tag = makeImportedAssetClassName(iconRefs[0][0].asset, ctx.aliases);
    } else if (iconRefs.length !== 0) {
      attrs["PlasmicIconType"] = joinVariantVals(
        iconRefs.map(([assetRef, variantCombo]) =>
          tuple(
            assetRef.asset.dataUri
              ? makeImportedAssetClassName(assetRef.asset, ctx.aliases)
              : "() => null",
            variantCombo
          )
        ),
        ctx.variantComboChecker,
        jsLiteral("div")
      ).value;
      tag = "PlasmicIcon__";
    }
    delete attrs["outerHTML"];
  }

  if (tag === "img") {
    if (!("alt" in attrs)) {
      attrs["alt"] = codeLit("").code;
    }

    if (shouldUsePlasmicImg(node, ctx.projectFlags)) {
      tag = "PlasmicImg__";
      plasmicImgAttrStyles.forEach((prop) => {
        const reactProp = toReactAttr(`display-${prop}`);
        if (!(reactProp in attrs)) {
          attrs[reactProp] = conditionalStyleProp(
            ctx,
            node,
            orderedVsettings,
            prop,
            (val) =>
              val
                ? deriveSizeStyleValue(
                    prop as any,
                    ctx.cssVarResolver.tryResolveTokenOrMixinRef(val)
                  )
                : undefined
          );
        }
      });
      if (ctx.exportOpts.imageOpts.scheme === "cdn") {
        attrs["loader"] = jsLiteral("plasmic");
      }
    }
  }

  const state = ctx.component.states.find((istate) => istate.tplNode === node);
  if (state) {
    assert(state.tplNode?.name, "a stateful tag should have a named tplNode");

    const tplVarName = toVarName(state.tplNode.name);
    const stateVarName = toVarName(
      isKnownNamedState(state) ? state.name : state.param.variable.name
    );
    const statePath = [
      `"${tplVarName}"`,
      ...serializeDataRepsIndexName(node),
      `"${stateVarName}"`,
    ];
    const builtinEventHandlers = {
      onChange: [
        `(e) => {
        generateStateOnChangeProp($state, [${statePath}])(e.target.value)
      }`,
      ],
    };
    mergeEventHandlers(attrs, builtinEventHandlers);

    attrs["value"] = `generateStateValueProp($state, [${statePath}]) ?? ""`;
  }

  const orderedCondStr = serializeDataConds(
    orderedVsettings.filter((vs) => shouldGenVariantSetting(ctx, vs)),
    variantComboChecker,
    ctx.exprCtx
  );
  return {
    orderedCondStr,
    wrapFlexChild,
    attrs,
    tag,
    triggeredHooks,
  };
}

function mergeEventHandlers(
  userAttrs: Record<string, string>,
  builtinEventHandlers: Record<string, string[]>
) {
  const chained = (handlerCodes: string[]) => {
    if (handlerCodes.length === 1) {
      return handlerCodes[0];
    } else {
      return `async (...eventArgs: any) => {
        ${handlerCodes
          .map((code) => `(${code}).apply(null, eventArgs);`)
          .join("\n")}
      }`;
    }
  };

  for (const key of Object.keys(builtinEventHandlers)) {
    userAttrs[key] = chained(
      withoutNils([...builtinEventHandlers[key], userAttrs[key]])
    );
  }
}

function serializeTplTag(ctx: SerializerBaseContext, node: TplTag) {
  const { nodeNamer } = ctx;
  const nodeName = nodeNamer(node);
  const orderedVsettings = getOrderedExplicitVSettings(ctx, node);

  let serializedChildren: string[];
  if (isTplTextBlock(node)) {
    serializedChildren = [
      serializeTplTextBlockContent(ctx, node, orderedVsettings).value,
    ];
  } else {
    serializedChildren = serializeTplNodesAsArray(ctx, node.children);
  }

  let { wrapFlexChild, attrs, orderedCondStr, tag, triggeredHooks } =
    serializeTplTagBase(ctx, node);

  if (attrs.children) {
    // If attrs.children has value (can only be the case in unit tests)
    // then prefer the attrs.children and blank out the original children,
    // as we can't have both a `children={}` prop and React.children.
    serializedChildren = [];
  }

  if (tag === "a") {
    tag = "PlasmicLink__";
    attrs["platform"] = jsLiteral(ctx.exportOpts.platform);
    if (isPageAwarePlatform(ctx.exportOpts.platform)) {
      attrs["component"] = "Link";
    }
  }

  const baseVs = node.vsettings.find((vs) => isBaseVariant(vs.variants));
  if (baseVs?.dataRep && !("key" in attrs)) {
    attrs["key"] = getRepetitionIndexName(baseVs.dataRep);
  }

  if (tplHasRef(node)) {
    attrs["ref"] = `(ref) => { $refs[${jsLiteral(nodeName)}] = ref; }`;
  }

  const serialized = makeCreatePlasmicElement(
    ctx,
    node,
    tag,
    nodeName,
    attrs,
    serializedChildren,
    wrapFlexChild,
    triggeredHooks,
    node === ctx.component.tplTree,
    !node.name
  );

  const serializedRepped = serializeDataReps(ctx, node, serialized);

  return maybeCondExpr(orderedCondStr, serializedRepped);
}

export function makeComponentAliases(
  referencedComps: Component[],
  platform: "react" | "nextjs" | "gatsby"
) {
  const aliases = new Map<Component, string>();
  const usedNames = new Set<string>(getPlatformImportComponents(platform));
  for (const comp of referencedComps) {
    const name = getImportedComponentName(new Map(), comp);
    if (usedNames.has(name)) {
      let count = 2;
      while (usedNames.has(name + count)) {
        count++;
      }
      aliases.set(comp, name + count);
      usedNames.add(name + count);
    } else {
      usedNames.add(name);
    }
  }
  return aliases;
}

const RE_WHITESPACE = /^\s*$/;
export function makeChildrenStr(serializedChildren: string[]) {
  const makeChild = (child: string) => {
    if (child.length === 0 || RE_WHITESPACE.test(child)) {
      return "";
    } else if (child.trimStart().startsWith("<")) {
      // Already in jsx, so keep as is
      return child;
    } else {
      // Else assume it's a js expression and wrap in {}
      return `{ ${child} }`;
    }
  };
  return serializedChildren.map(makeChild).join("\n");
}

/**
 * Receives a tag name as argument and returns whether that name is
 * a React component or a plain HTML tag. An element is considered to
 * be a React component if it has a dot (because HTML tags have no dots
 * but @plasmicapp/react-web components do) or starts with an uppercase
 * letter.
 */
function isReactComponent(elementType: string): boolean {
  if (elementType.includes(".")) {
    return true;
  }

  return elementType.charAt(0).toUpperCase() === elementType.charAt(0);
}

function getDataPlasmicOverride(
  nodeName: string,
  isPlasmicDefaultNodeName: boolean | undefined
): string {
  // For compability, we should keep addressing previous default names
  return [
    `overrides.${nodeName}`,
    ...(isPlasmicDefaultNodeName && nodeName in nodeNameBackwardsCompatibility
      ? ensureArray(nodeNameBackwardsCompatibility[nodeName]).map(
          (name) => `overrides.${name}`
        )
      : []),
  ].join(" ?? ");
}

function makeCreatePlasmicElement(
  ctx: SerializerBaseContext,
  node: TplNode,
  elementType: string,
  nodeName: string | undefined,
  attrs: L.Dictionary<string>,
  serializedChildren: string[],
  wrapChildrenInFlex?: string,
  triggeredHooks?: ReactHookSpec[],
  isRoot?: boolean,
  isPlasmicDefaultNodeName?: boolean
) {
  const keys = L.keys(attrs).sort();
  const hasChildren = serializedChildren.length > 0;
  const hasGap = wrapChildrenInFlex && wrapChildrenInFlex !== "false";
  const tagType = hasGap ? "Stack__" : elementType;
  // Detect if elementType is a React component to decide between
  // <Stack as={Component}> and <Stack as={"tag"}>.
  const asType = isReactComponent(elementType)
    ? elementType
    : jsLiteral(elementType);
  const skinny = ctx.exportOpts.skinny;
  const isFakeTpl = ctx.fakeTpls.includes(node);

  const serializeComponentCall = (is$PropsCreated: boolean) => {
    return `<${tagType}
      ${hasGap ? `as={${asType}}` : ""}
      ${
        !skinny && nodeName && !isFakeTpl
          ? `data-plasmic-name={${jsLiteral(nodeName)}}`
          : ""
      }
      ${
        nodeName && !isFakeTpl
          ? `data-plasmic-override={${getDataPlasmicOverride(
              nodeName,
              isPlasmicDefaultNodeName
            )}}`
          : ""
      }
      ${!skinny && isRoot ? `data-plasmic-root={true}` : ""}
      ${!skinny && isRoot ? `data-plasmic-for-node={forNode}` : ""}
      ${hasGap ? `hasGap={${wrapChildrenInFlex}}` : ""}
      ${
        is$PropsCreated
          ? `{...child$Props}`
          : keys
              .map((key) => `${serializedKeyValue(key, `${attrs[key]}`)}`)
              .join("\n")
      }
      ${
        triggeredHooks && triggeredHooks.length > 0
          ? `data-plasmic-trigger-props={[${L.uniq(
              triggeredHooks.flatMap((spec) => spec.getTriggerPropNames())
            ).join(", ")}]}`
          : ""
      }
      ${
        hasChildren
          ? `>
            ${makeChildrenStr(serializedChildren)}
          </${tagType}>`
          : `/>`
      }`;
  };

  const serializedDataRepsName = isTplTagOrComponent(node)
    ? serializeDataRepsIndexName(node)
    : [];

  const statesUsingCtx = ctx.component.states.filter((state) => {
    if (
      state.tplNode !== node ||
      (state.implicitState && isReadonlyState(state.implicitState))
    ) {
      return false;
    }
    return (
      serializedDataRepsName.length > 0 ||
      node.vsettings.some((vs) => {
        if (isKnownTplComponent(node)) {
          const arg = vs.args.find(
            (vsArg) => vsArg.param === state.implicitState?.param
          );
          return arg ? exprUsesCtxOrFreeVars(arg.expr) : false;
        } else {
          const namedState = ensureKnownNamedState(state);
          const expr = vs.attrs[toVarName(namedState.name)];
          return expr ? exprUsesCtxOrFreeVars(expr) : false;
        }
      })
    );
  });
  const maybeUseCodeComponentHelpers =
    isTplCodeComponent(node) && isCodeComponentWithHelpers(node.component);
  if (
    isFakeTpl ||
    (statesUsingCtx.length === 0 && !maybeUseCodeComponentHelpers)
  ) {
    return serializeComponentCall(false);
  }
  const codeComponentHelperName =
    isTplComponent(node) && isCodeComponentWithHelpers(node.component)
      ? getImportedCodeComponentHelperName(ctx.aliases, node.component)
      : "undefined";
  const codeComponentStates = isTplCodeComponent(node)
    ? ctx.component.states.filter(
        (state) => state.implicitState && state.tplNode === node
      )
    : [];
  return `(() => {
    const child$Props = {${keys
      .map((key) => `${serializedKeyValueForObject(key, `${attrs[key]}`)}`)
      .join(",\n")}};
    ${
      codeComponentStates.length > 0
        ? `initializeCodeComponentStates($state, [
            ${codeComponentStates
              .map(
                (state) => `{
              name: "${ensureKnownNamedState(state.implicitState).name}",
              plasmicStateName: "${getStateVarName(state)}"
            }`
              )
              .join(",")}
          ], [${serializedDataRepsName}], ${codeComponentHelperName} ?? {}, child$Props)`
        : ``
    }
    ${
      statesUsingCtx.length > 0
        ? `initializePlasmicStates($state, [
          ${statesUsingCtx
            .map(
              (state) => `{
            name: "${getStateVarName(state)}",
            initFunc: ${serializeInitFunc(state, ctx, true)}
          }`
            )
            .join(",")}],
          [${serializedDataRepsName}])`
        : ``
    }
    return (
        ${serializeComponentCall(true)}
    )
  })()`;
}

function wrapInDataCtxReader(nodeStr: string) {
  // nodeStr may be a single React element, or a code expression
  // (for example, if child is a repeated element).
  return `<DataCtxReader__>{
    ($ctx) => (${nodeStr})
  }</DataCtxReader__>`;
}

export function serializeTplComponentBase(
  ctx: SerializerBaseContext,
  node: TplComponent,
  opts?: {
    additionalClassExpr?: string[];
  }
) {
  const { variantComboChecker } = ctx;
  const isFakeTpl = ctx.fakeTpls.includes(node);
  const { attrs, variantArgNames } = conditionalComponentArgs(ctx, node);

  const slotParams = getSlotParams(node.component).filter(
    (p) =>
      ctx.exportOpts.forceAllProps || p.exportType === ParamExportType.External
  );
  const serializedChildren: string[] = [];
  for (const slotParam of slotParams) {
    const arg = $$$(node).getSlotArg(slotParam.variable.name);
    if (
      arg &&
      isKnownRenderExpr(arg.expr) &&
      (!isKnownVirtualRenderExpr(arg.expr) ||
        (isCodeComponent(node.component) && arg.expr.tpl.length > 0))
    ) {
      const attr = toVarName(slotParam.variable.name);
      if (arg.expr.tpl.length === 0) {
        attrs[attr] = jsLiteral(null);
      } else {
        const nodes = serializeTplSlotArgsAsArray(ctx, arg.param, arg.expr.tpl);
        let serialized: string[] = nodes;
        if (
          ctx.componentGenHelper.siteHelper.shouldWrapSlotContentInDataCtxReader(
            node.component,
            slotParam
          )
        ) {
          serialized = [wrapInDataCtxReader(asOneNode(serialized))];
        }
        if (isKnownRenderFuncType(slotParam.type)) {
          serialized = [
            `(${slotParam.type.params
              .map((p) => `${p.argName}: any`)
              .join(", ")}) => ${asOneNode(serialized)}`,
          ];
        }

        if (attr === "children") {
          serializedChildren.push(...serialized);
        } else {
          attrs[attr] = asOneNode(serialized);
        }
      }
    }
  }

  const orderedVsettings = getOrderedExplicitVSettings(ctx, node);
  const orderedCondStr = serializeDataConds(
    orderedVsettings,
    variantComboChecker,
    ctx.exprCtx
  );

  // For code component, all CSS settings are applicable. Otherwise,
  // if this TplComponent has variant settings, then they should just be about
  // positioning this component (left/top, width/height).  We then wrap this
  // component in a div with those positioning styles.
  const orderedApplicableVSettings = isCodeComponent(node.component)
    ? orderedVsettings
    : orderedVsettings.filter((vs) => {
        const exp = ctx.componentGenHelper.getEffectiveExpr(node, vs.variants);
        for (const prop of TPL_COMPONENT_PROPS) {
          if (
            exp.has(prop) &&
            exp.get(prop) !== tryGetBrowserCssInitial(prop)
          ) {
            return true;
          }
        }
        return false;
      });
  const serializedAppicableClassName =
    orderedApplicableVSettings.length > 0 ||
    (opts?.additionalClassExpr?.length ?? 0) > 0
      ? serializeClassNames(
          ctx,
          node,
          orderedApplicableVSettings,
          opts?.additionalClassExpr
        )
      : undefined;

  if (serializedAppicableClassName) {
    const classNameProp =
      (isCodeComponent(node.component) &&
        node.component.codeComponentMeta.classNameProp) ||
      "className";
    if (attrs[classNameProp]) {
      attrs[
        classNameProp
      ] = `${attrs.className} + " " + ${serializedAppicableClassName}`;
    } else {
      attrs[classNameProp] = serializedAppicableClassName;
    }
  }

  if (!isFakeTpl) {
    const builtinEventHandlers: Record<string, string[]> = {};
    ctx.component.states
      .filter((state) => state.tplNode === node)
      .forEach((state) => {
        assert(
          !!state.implicitState,
          `${getStateDisplayName(state)} should be an implicit state`
        );

        const tplVarName = toVarName(state.tplNode!.name ?? "undefined");
        const statePath = [
          `"${tplVarName}"`,
          ...serializeDataRepsIndexName(node),
          `"${toVarName(getLastPartOfImplicitStateName(state))}"`,
        ];
        const maybeOnChangePropName = getStateOnChangePropName(
          state.implicitState
        );
        if (maybeOnChangePropName) {
          const pushEventHandler = (handlerCode: string) => {
            withDefaultFunc(
              builtinEventHandlers,
              maybeOnChangePropName,
              () => []
            ).push(handlerCode);
          };
          if (node.component.plumeInfo) {
            const plugin = getPlumeCodegenPlugin(node.component);
            pushEventHandler(`(...eventArgs) => {
              generateStateOnChangeProp($state, [${statePath}])(${
              plugin?.genOnChangeEventToValue
                ? `(${plugin.genOnChangeEventToValue}).apply(null, eventArgs)`
                : "eventArgs[0]"
            })}`);
          } else if (
            isTplCodeComponent(node) &&
            isCodeComponentWithHelpers(node.component)
          ) {
            const stateName = ensureKnownNamedState(state.implicitState).name;
            const codeComponentHelperName = getImportedCodeComponentHelperName(
              ctx.aliases,
              node.component
            );
            pushEventHandler(
              `generateStateOnChangePropForCodeComponents($state, "${stateName}", [${statePath}], ${codeComponentHelperName})`
            );
          } else {
            pushEventHandler(
              `generateStateOnChangeProp($state, [${statePath}])`
            );
          }
        }

        if (isWritableState(state.implicitState)) {
          const plumeType = node.component.plumeInfo?.type ?? "";
          attrs[
            getStateValuePropName(state.implicitState!)
          ] = `generateStateValueProp($state, [${statePath}])${
            ["switch", "checkbox"].includes(plumeType)
              ? `?? false`
              : plumeType === "text-input"
              ? `?? ""`
              : ""
          }`;
        }
      });
    mergeEventHandlers(attrs, builtinEventHandlers);
  }

  if (
    isBuiltinCodeComponent(node.component) &&
    node.component.name ===
      getBuiltinComponentRegistrations().PlasmicFetcher.meta.name
  ) {
    attrs["queries"] = ctx.usesComponentLevelQueries ? "$queries" : "{}";
  }

  const plugin = getPlumeCodegenPlugin(node.component);
  if (plugin && plugin.twiddleGenInstanceProps) {
    plugin.twiddleGenInstanceProps(node, attrs);
  }

  const triggeredHooks = ctx.reactHookSpecs.filter(
    (spec) => spec.triggerNode === node
  );

  return {
    orderedCondStr,
    attrs,
    serializedChildren,
    triggeredHooks,
    variantArgNames,
  };
}

function serializeTplComponent(ctx: SerializerBaseContext, node: TplComponent) {
  const { nodeNamer } = ctx;
  const nodeName = nodeNamer(node);
  const { attrs, orderedCondStr, serializedChildren, triggeredHooks } =
    serializeTplComponentBase(ctx, node);
  const isRoot = node === ctx.component.tplTree;

  const baseVs = node.vsettings.find((vs) => isBaseVariant(vs.variants));
  if (baseVs?.dataRep && !("key" in attrs)) {
    attrs["key"] = getRepetitionIndexName(baseVs.dataRep);
  }

  if (tplHasRef(node)) {
    attrs[
      node.component.codeComponentMeta?.refProp ?? "ref"
    ] = `(ref) => { $refs[${jsLiteral(nodeName)}] = ref; }`;
  }

  if (isRoot && isTplRootWithCodeComponentInteractionVariants(node)) {
    attrs["updateInteractionVariant"] = `updateInteractionVariant`;
  }

  let componentStr = makeCreatePlasmicElement(
    ctx,
    node,
    getImportedComponentName(ctx.aliases, node.component),
    nodeName,
    attrs,
    serializedChildren,
    undefined,
    triggeredHooks,
    isRoot
  );

  componentStr = serializeDataReps(ctx, node, componentStr);

  return maybeCondExpr(orderedCondStr, componentStr);
}

export function serializeTplSlotArgsAsArray(
  ctx: SerializerBaseContext,
  param: Param,
  nodes: TplNode[]
) {
  // If possible to serialize as a string prop, do so
  const asStringProp = maybeSerializeAsStringProp(ctx, nodes);
  if (asStringProp !== undefined) {
    return asStringProp;
  }

  // Otherwise, serialize nodes as usual
  return serializeTplNodesAsArray(ctx, nodes);
}

export function maybeSerializeAsStringProp(
  ctx: SerializerBaseContext,
  nodes: TplNode[]
) {
  if (
    nodes.length === 1 &&
    isTplPlainText(nodes[0]) &&
    // Can only serialize as a plain string if no repeats
    nodes[0].vsettings.every((vs) => !vs.dataRep) &&
    (nodes[0] as TplTextTag).vsettings.every((vs) => !vs.attrs.children) &&
    ((n: TplNode) => !isTplNamable(n) || !n.name)(nodes[0])
  ) {
    const { variantComboChecker } = ctx;
    // For plain text nodes, we pass the argument as just plain text, instead
    // of wrapped in a tag.  We perform a check on vs.attrs.children above
    // in case a children override has been specified, which is only relevant
    // to the data-binding demo
    const orderedVsettings = getOrderedExplicitVSettings(
      ctx,
      nodes[0] as TplTextTag
    );
    const value = serializeTplTextBlockContent(
      ctx,
      nodes[0],
      orderedVsettings
    ).value;
    const orderedCondStr = serializeDataConds(
      orderedVsettings,
      variantComboChecker,
      ctx.exprCtx
    );
    return [maybeCondExpr(orderedCondStr, value)];
  }

  return undefined;
}

export function serializeTplSlotBase(
  ctx: SerializerBaseContext,
  node: TplSlot
) {
  const { variantComboChecker } = ctx;
  // Output either the argument passed in for this slot, or the defaultContents
  const varName = toVarName(node.param.variable.name);
  const orderedVsettings = getOrderedExplicitVSettings(ctx, node);
  const orderedCondStr = serializeDataConds(
    orderedVsettings.filter((vs) => shouldGenVariantSetting(ctx, vs)),
    variantComboChecker,
    ctx.exprCtx
  );
  const isStyledSlot = isStyledTplSlot(node);

  const slotClassName = isStyledSlot
    ? serializeClassNames(ctx, node, orderedVsettings)
    : undefined;
  return {
    orderedCondStr,
    slotClassName,
    argValue: `args.${varName}`,
    fallback: node.defaultContents,
  };
}

function serializeTplSlot(ctx: SerializerBaseContext, node: TplSlot) {
  const { orderedCondStr, argValue, slotClassName, fallback } =
    serializeTplSlotBase(ctx, node);
  const serializedFallbackArray = serializeTplSlotArgsAsArray(
    ctx,
    node.param,
    fallback
  );
  const serializedFallback = asOneNode(serializedFallbackArray);
  const serializedSlot = `renderPlasmicSlot({
      defaultContents: ${serializedFallback},
      value: ${argValue},
      ${slotClassName ? `className: ${slotClassName}` : ""}
  })`;
  return maybeCondExpr(orderedCondStr, serializedSlot);
}

/**
 * Returns a snippet of code that guards whether a TplNode should be rendered,
 * based on its variants and dataCond.
 */
function serializeDataConds(
  variantSettings: VariantSetting[],
  variantComboChecker: VariantComboChecker,
  exprCtx: ExprCtx
) {
  const condVariants = variantSettings.filter((v) => !!v.dataCond);

  // If no variants have dataCond, then don't worry about it!
  if (condVariants.length === 0) {
    return "";
  }

  // If all the condVariants say "true", then also don't worry
  // about it
  if (
    condVariants.every(
      (vs) =>
        getRawCode(
          ensure(vs.dataCond, "condVariants all have dataCond"),
          exprCtx
        ) === "true"
    )
  ) {
    return "";
  }

  // Otherwise, we want to use the first variant with a dataCond that is turned
  // on, and that variant solely determines whether this TplNode is rendered.
  // So, the ordering matters here; note that this is a series of
  // `hasVariant(v1) ? v1.dataCond : hasVariant(v2) ? v2.dataCond : true`, rather
  // than a series of ||.
  const condStr = joinVariantVals(
    condVariants.map((vs) =>
      tuple(
        getRawCode(ensure(vs.dataCond, "unexpected nullish dataCond"), exprCtx),
        vs.variants
      )
    ),
    variantComboChecker,
    "true"
  ).value;
  return `${condStr}`;
}

export function getNumberOfRepeatingAncestors(node: TplNode) {
  return ancestorsUp(node).filter(isTplRepeated).length;
}

export function getRepetitionItemInternalName(idx: number) {
  return `__plasmic_item_${idx}`;
}

export function getRepetitionIndexInternalName(idx: number) {
  return `__plasmic_idx_${idx}`;
}

export function serializeDataRepsIndexName(node: TplTag | TplComponent) {
  return [...Array(getNumberOfRepeatingAncestors(node))].map((_, i) =>
    getRepetitionIndexInternalName(i)
  );
}

export function serializeDataReps(
  ctx: SerializerBaseContext,
  node: TplTag | TplComponent,
  serializedContent: string
) {
  const baseVs = node.vsettings.find((vs) => isBaseVariant(vs.variants));
  if (!baseVs?.dataRep) {
    return serializedContent;
  }

  const elementName = getRepetitionElementName(baseVs.dataRep);
  const indexName = getRepetitionIndexName(baseVs.dataRep);

  const idx = getNumberOfRepeatingAncestors(node) - 1;
  const elementInternalName = getRepetitionItemInternalName(idx);
  const indexInternalName = getRepetitionIndexInternalName(idx);

  const collectionCode = getRawCode(baseVs.dataRep.collection, ctx.exprCtx);
  const code = `(${serializeEnsureArray(collectionCode)}).map(
    (${elementInternalName}, ${indexInternalName}) => {
      const ${elementName} = ${elementInternalName};
      const ${indexName} = ${indexInternalName};
      return (
        ${serializedContent}
      );
    }
  )`;

  return code;
}

function serializeEnsureArray(serializedCode: string) {
  return `((_par) => !_par ? [] : Array.isArray(_par) ? _par : [_par])(${serializedCode})`;
}

export function asOneNode(nodes: string[]) {
  if (nodes.length === 0) {
    return "null";
  } else if (nodes.length === 1) {
    return nodes[0];
  } else {
    return `<React.Fragment>${makeChildrenStr(nodes)}</React.Fragment>`;
  }
}

/**
 * Returns code that creates the argument nodes list.  If there's more
 * than one node, then a Fragment is created to wrap them.
 */
function serializeTplNodesAsArray(
  ctx: SerializerBaseContext,
  nodes: TplNode[]
) {
  return nodes.map((child) => ctx.serializeTplNode(ctx, child));
}

function shouldWrapWithPageGuard(
  ctx: SerializerBaseContext,
  component: Component
) {
  if (!isPageComponent(component)) {
    return false;
  }
  const roleId = component.pageMeta?.roleId;
  return !!roleId;
}

function serializeWithPlasmicPageGuard(
  ctx: SerializerBaseContext,
  component: Component
) {
  if (!shouldWrapWithPageGuard(ctx, component)) {
    return "";
  }

  const unauthorizedComp = ctx.site.defaultComponents.unauthorized;

  function generateUnauthorizedSubstituteComponentCall() {
    if (unauthorizedComp && ctx.exportOpts.useComponentSubstitutionApi) {
      return generateSubstituteComponentCalls(
        [unauthorizedComp],
        ctx.exportOpts,
        ctx.aliases
      );
    }
    return "";
  }

  function generateUnauthorizedComp() {
    if (unauthorizedComp) {
      const componentName =
        ctx.aliases.get(unauthorizedComp) ||
        getExportedComponentName(unauthorizedComp);
      return `unauthorizedComp={<${componentName} />}`;
    }
    return "";
  }

  const roleId = component.pageMeta?.roleId;
  // authorizeEndpoint should point to studio, as the authorize endpoint
  // is actually the studio page where the user authorizes the app to
  // access their data.
  return `function withPlasmicPageGuard<P extends object>(
    WrappedComponent: React.ComponentType<P>
  ) {

    ${generateUnauthorizedSubstituteComponentCall()}

    const PageGuard: React.FC<P> = (props) => (
      <PlasmicPageGuard__
        minRole={${jsLiteral(roleId)}}
        appId={${jsLiteral(ctx.projectConfig.projectId)}}
        authorizeEndpoint={${jsLiteral(`${getPublicUrl()}/authorize`)}}
        canTriggerLogin={${jsLiteral(ctx.appAuthProvider === "plasmic-auth")}}
        ${generateUnauthorizedComp()}
      >
        <WrappedComponent {...props} />
      </PlasmicPageGuard__>
    );
    return PageGuard;
  }
`;
}

function shouldWrapWithUsePlasmicAuth(
  ctx: SerializerBaseContext,
  component: Component
) {
  return (
    isPageComponent(component) &&
    ctx.appAuthProvider === "plasmic-auth" &&
    !ctx.exportOpts.isLivePreview
  );
}

function serializeWithUsePlasmicAuth(
  ctx: SerializerBaseContext,
  component: Component
) {
  if (!shouldWrapWithUsePlasmicAuth(ctx, component)) {
    return "";
  }
  // Wrap all pages with withUsePlasmicAuth to provide user info and login trigger
  // relies on a context PlasmicDataSourceContextProvider that provides auth redirect uri.

  // We will override the host if it's codegen from development mode (localhost)
  // otherwise, it should fallback to the default host.
  const authHost = getIntegrationsUrl();

  return `function withUsePlasmicAuth<P extends object>(
    WrappedComponent: React.ComponentType<P>
  ) {
    const WithUsePlasmicAuthComponent: React.FC<P> = (props) => {
      const dataSourceCtx = usePlasmicDataSourceContext() ?? {};
      const { isUserLoading, user, token } = plasmicAuth.usePlasmicAuth({
        appId: ${jsLiteral(ctx.projectConfig.projectId)},
        ${authHost.startsWith("http:") ? `host: ${jsLiteral(authHost)},` : ""}
      });

      return (
        <PlasmicDataSourceContextProvider__
          value={{
            ...dataSourceCtx,
            isUserLoading,
            userAuthToken: token,
            user,
          }}
        >
          <WrappedComponent {...props} />
        </PlasmicDataSourceContextProvider__>
      )
    }
    return WithUsePlasmicAuthComponent;
  }`;
}

function serializeNodeComponents(ctx: SerializerBaseContext) {
  const { component, nodeNamer } = ctx;
  const rootName = nodeNamer(component.tplTree);
  const descendantNodes = getNamedDescendantNodes(
    ctx.nodeNamer,
    component.tplTree
  ).filter((t) => t !== component.tplTree);
  const vtype = makeVariantsArgTypeName(component);
  const atype = makeArgsTypeName(component);
  const otype = makeOverridesTypeName(component);
  const componentName = makePlasmicComponentName(component);

  function serializeMakeNodeComponent(node: TplTag | TplComponent) {
    const nodeName = ensure(
      nodeNamer(node),
      "Unexpected nodeNamer nullish return for " + node.uuid
    );
    let makeNode = `makeNodeComponent(${jsLiteral(nodeName)})`;

    if (nodeName === rootName) {
      if (shouldWrapWithPageGuard(ctx, component)) {
        makeNode = `withPlasmicPageGuard(${makeNode})`;
      }

      // withUsePlasmicAuth should wrap withPlasmicPageGuard since page guard depends on it
      if (shouldWrapWithUsePlasmicAuth(ctx, component)) {
        makeNode = `withUsePlasmicAuth(${makeNode})`;
      }
    }

    return makeNode;
  }

  return `
    type ReservedPropsType = "variants" | "args" | "overrides";
    type NodeOverridesType<T extends NodeNameType> = Pick<${otype}, DescendantsType<T>>;
    type NodeComponentProps<T extends NodeNameType> = (
      // Explicitly specify variants, args, and overrides as objects
      & {
        variants?: ${vtype};
        args?: ${atype};
        overrides?: NodeOverridesType<T>;
      }
      // Specify variants directly as props
      & Omit<${vtype}, ReservedPropsType>
      // Specify args directly as props
      & Omit<${atype}, ReservedPropsType>
      // Specify overrides for each element directly as props
      & Omit<NodeOverridesType<T>, ReservedPropsType | VariantPropType | ArgPropType>
      // Specify props for the root element
      & Omit<Partial<React.ComponentProps<NodeDefaultElementType[T]>>, ReservedPropsType | VariantPropType | ArgPropType | DescendantsType<T>>
    );
    function makeNodeComponent<NodeName extends NodeNameType>(nodeName: NodeName) {
      type PropsType = NodeComponentProps<NodeName> & {key?: React.Key};
      const func = function<T extends PropsType>(props: T & StrictProps<T, PropsType>) {
        const {variants, args, overrides} = React.useMemo(() => deriveRenderOpts(props, {
          name: nodeName,
          descendantNames: ${
            ctx.exportOpts.targetEnv === "loader"
              ? `${makeDescendantsName()}`
              : `${makeDescendantsName()}[nodeName]`
          },
          internalArgPropNames: ${makeArgPropsName(component)},
          internalVariantPropNames: ${makeVariantPropsName(component)},
        }), [props, nodeName]);
        return ${makeRenderFuncName(
          component
        )}({ variants, args, overrides, forNode: nodeName });
      };
      if (nodeName === ${jsLiteral(rootName)}) {
        func.displayName = ${jsLiteral(componentName)};
      } else {
        func.displayName = \`${componentName}.\${nodeName}\`;
      }
      return func;
    }

    ${serializeWithPlasmicPageGuard(ctx, component)}
    ${serializeWithUsePlasmicAuth(ctx, component)}

    export const ${componentName} = Object.assign(
      // Top-level ${componentName} renders the root element
      ${serializeMakeNodeComponent(component.tplTree as TplTag | TplComponent)},
      {
        // Helper components rendering sub-elements
        ${
          ctx.exportOpts.skinny
            ? ""
            : descendantNodes
                .map(
                  (node) =>
                    `${ensureValidFunctionPropName(
                      ensure(
                        nodeNamer(node),
                        "Unexpected nodeNamer nullish return for " + node.uuid
                      )
                    )}: ${serializeMakeNodeComponent(node)},`
                )
                .join("\n")
        }

        // Metadata about props expected for ${componentName}
        internalVariantProps: ${makeVariantPropsName(component)},
        internalArgProps: ${makeArgPropsName(component)},

        ${
          component.subComps.length === 0
            ? ""
            : `
          // Context for sub components
          Context: ${makePlasmicSuperContextName(component)},
        `
        }

        ${component.plumeInfo ? "useBehavior," : ""}

        ${
          Object.entries(component.metadata).length === 0
            ? ""
            : `
          // Key-value metadata
          metadata: {${Object.entries(component.metadata).map(
            ([key, value]) => `${key}: ${jsLiteral(value)}`
          )}
          },`
        }

        ${serializePageMetadata(ctx, component)}
      }
    );
  `;
}

export function customFunctionImportAlias(customFunction: CustomFunction) {
  const customFunctionPrefix = `__fn_`;
  return customFunction.namespace
    ? `${customFunctionPrefix}${customFunction.namespace}__${customFunction.importName}`
    : `${customFunctionPrefix}${customFunction.importName}`;
}

export function codeLibraryImportAlias(lib: CodeLibrary) {
  const libPrefix = `__lib_`;
  return `${libPrefix}${lib.jsIdentifier}`;
}

export function codeLibraryFnImportAlias(lib: CodeLibrary, fn: string) {
  const libPrefix = `__lib_`;
  return `${libPrefix}${lib.jsIdentifier}__${fn}`;
}

function serializeCustomFunctionsAndLibs(ctx: SerializerBaseContext) {
  const { customFunctions, codeLibraries } =
    customFunctionsAndLibsUsedByComponent(ctx.site, ctx.component);

  if (!customFunctions.length && !codeLibraries.length) {
    return {
      customFunctionsAndLibsImport: "",
      serializedCustomFunctionsAndLibs: "const $$ = {};",
    };
  }

  const customFunctionToOwnerSite = new Map<CustomFunction, Site>();
  allCustomFunctions(ctx.site).forEach(({ customFunction, site }) =>
    customFunctionToOwnerSite.set(customFunction, site)
  );

  let importLoaderRegistry = false;

  // The custom functions can be imported differntly depending on the
  // `exportOpts`:
  // - If `useCustomFunctionsStub` is set, it means we will import the functions
  //   from a common "stub". It happens in:
  //      - Live preview: We just read all code fuctions from `window` and
  //        export them from `./custom-functions`.
  //      - Loader: For user-registered functions, we import them from the
  //        `@plasmicapp/loader-runtime-registry`, but for hostless functions,
  //        we actually import from the usual `importPath` from our servers
  //        (similar to what we do for code components).
  // - If `useCustomFunctionsStub` is not set, we need to use the `importPath`:
  //      - For user-generated functions, the path might be a relative path, so
  //        we defer to `cli/` to generate the final path.
  //      - For hostless functions, we can always import directly from the NPM
  //        package in the `importPath`.
  let customFunctionsAndLibsImport = [
    ...customFunctions.map((fn) => {
      const ownerSite = ensure(
        customFunctionToOwnerSite.get(fn),
        () => `No ownerSite for CustomFunction ${customFunctionId(fn)}`
      );

      if (ctx.exportOpts.useCustomFunctionsStub) {
        // Use the functions stub module for user registered functions.
        if (ctx.exportOpts.isLivePreview) {
          return `import { ${customFunctionImportAlias(
            fn
          )} } from "./custom-functions";`;
        }
        // For hostless custom functions, we only do that in live preview.
        if (!isHostLessPackage(ownerSite)) {
          importLoaderRegistry = true;
          return `const { ${customFunctionImportAlias(
            fn
          )} } = registeredCustomFunctions;`;
        }
      }
      // We need to import from the `importPath`. For hostless functions,
      // we can reference the import paths directly. But, for codegen, we
      // generate a dummy path and fix it up in the `cli/`.
      const importPath = isHostLessPackage(ownerSite)
        ? `"${fn.importPath}";`
        : `"./importPath__${customFunctionId(
            fn
          )}"; // plasmic-import: ${customFunctionId(fn)}/customFunction`;
      return `import ${
        fn.defaultExport
          ? customFunctionImportAlias(fn)
          : `{ ${fn.importName} as ${customFunctionImportAlias(fn)} }`
      } from ${importPath}`;
    }),
    ...codeLibraries.map(([lib, imports]) => {
      // We only support "hostless" code libraries, so we never generate imports
      // from `@plasmicapp/loader-runtime-registry` and also never need to defer
      // to `cli/` to fix relative import paths.
      // The only cases we need to handle are:
      // - Live preview: import the whole lib from the same
      //   "./custom-functions" module.
      // - Loader / codegen: import from the `importPath` NPM package.
      if (ctx.exportOpts.isLivePreview) {
        return `import { ${codeLibraryImportAlias(
          lib
        )} } from "./custom-functions";`;
      } else {
        // For tree shaking, if we know which functions will be used, we can
        // import only those
        return `import ${
          Array.isArray(imports)
            ? `{ ${imports
                .map(
                  (importedFn) =>
                    `${importedFn} as ${codeLibraryFnImportAlias(
                      lib,
                      importedFn
                    )}`
                )
                .join(", ")} }`
            : lib.importType === "namespace"
            ? `* as ${codeLibraryImportAlias(lib)}` // namespace import
            : lib.importType === "default"
            ? `${codeLibraryImportAlias(lib)}` // default import
            : `{ ${lib.namedImport} as ${codeLibraryImportAlias(lib)} }` // named import
        } from "${lib.importPath}";`;
      }
    }),
  ].join("\n");

  if (importLoaderRegistry) {
    customFunctionsAndLibsImport = `import { functions as registeredCustomFunctions } from "@plasmicapp/loader-runtime-registry";
${customFunctionsAndLibsImport}`;
  }

  const serializedCustomFunctionsAndLibs = `const $$ = {
    ${[
      ...customFunctions.filter((f) => !f.namespace),
      ...Object.values(
        groupBy(
          customFunctions.filter((f) => !!f.namespace),
          (f) => f.namespace
        )
      ),
    ]
      .map((functionOrGroup) =>
        !Array.isArray(functionOrGroup)
          ? `${functionOrGroup.importName}: ${customFunctionImportAlias(
              functionOrGroup
            )},`
          : `${functionOrGroup[0].namespace}: {
          ${functionOrGroup
            .map((fn) => `${fn.importName}: ${customFunctionImportAlias(fn)},`)
            .join("\n")}
        },`
      )
      .join("\n")}
    ${codeLibraries
      .map(
        ([lib, imports]) =>
          `${lib.jsIdentifier}: ${
            imports === "all" || ctx.exportOpts.isLivePreview
              ? codeLibraryImportAlias(lib)
              : `{
            ${imports
              .map(
                (importedFn) =>
                  `${importedFn}: ${codeLibraryFnImportAlias(lib, importedFn)},`
              )
              .join("\n")}
          }`
          },`
      )
      .join("\n")}
  };`;

  return { customFunctionsAndLibsImport, serializedCustomFunctionsAndLibs };
}

export function exportCustomFunctionConfig(
  customFunction: CustomFunction
): CustomFunctionConfig {
  return {
    id: customFunctionId(customFunction),
    name: customFunction.importName,
    namespace: customFunction.namespace,
    importPath: customFunction.importPath,
    defaultExport: customFunction.defaultExport,
  };
}

export function getNamedDescendantNodes(nodeNamer: NodeNamer, node: TplNode) {
  return flattenTpls(node)
    .filter(isTplTagOrComponent)
    .filter((n) => !!nodeNamer(n));
}

function serializeOverridesType(ctx: SerializerBaseContext) {
  const { component } = ctx;
  return `export type ${makeOverridesTypeName(
    component
  )} = ${serializeOverridesTypeForNode(ctx, component.tplTree)};`;
}

function serializeOverridesTypeForNode(
  ctx: SerializerBaseContext,
  node: TplNode
) {
  const descendantNodes = getNamedDescendantNodes(ctx.nodeNamer, node);
  const overrideTypes = serializeOverridesTypes(ctx, descendantNodes);
  return `{
    ${overrideTypes.map(([key, value]) => `${key}?: ${value};`).join("\n")}
  }`;
}

function serializeOverridesTypes(
  ctx: SerializerBaseContext,
  descendantNodes: (TplTag | TplComponent)[]
) {
  const makeNodeOverride = (node: TplTag | TplComponent) => {
    const name = ensure(
      ctx.nodeNamer(node),
      "Unexpected nodeNamer nullish return for " + node.uuid
    );
    let val = `Flex__<${serializeDefaultElementType(ctx, node)}>`;

    if (
      isKnownTplTag(node) &&
      node.tag === "a" &&
      isPageAwarePlatform(ctx.exportOpts.platform)
    ) {
      val += ` & Partial<LinkProps>`;
    }

    return tuple(name, val);
  };

  // For compability, we should keep addressing previous default names
  const serializedOverridesTypes = descendantNodes.map((node) =>
    makeNodeOverride(node)
  );
  descendantNodes
    .filter(
      (node) =>
        !node.name &&
        ensure(
          ctx.nodeNamer(node),
          "Unexpected nodeNamer nullish return for " + node.uuid
        ) in nodeNameBackwardsCompatibility
    )
    .forEach((node) => {
      serializedOverridesTypes.push(
        ...ensureArray(
          nodeNameBackwardsCompatibility[
            ensure(
              ctx.nodeNamer(node),
              "Unexpected nodeNamer nullish return for " + node.uuid
            )
          ]
        ).map((prevNodeName) => tuple(prevNodeName, makeNodeOverride(node)[1]))
      );
    });
  return serializedOverridesTypes;
}

function serializeDefaultElementType(
  ctx: SerializerBaseContext,
  node: TplTag | TplComponent
) {
  if (isTplTag(node)) {
    if (shouldUsePlasmicImg(node, ctx.projectFlags)) {
      return `typeof PlasmicImg__`;
    } else {
      return jsString(node.tag);
    }
  } else {
    return `typeof ${getImportedComponentName(ctx.aliases, node.component)}`;
  }
}

export function getParamNames(component: Component, params: Param[]) {
  return params.map((p) => paramToVarName(component, p));
}

/**
 * Returns the default props for the wrapper component
 */
export function serializeDefaultExternalProps(
  ctx: SerializerBaseContext,
  opts?: { typeName?: string }
) {
  const { component } = ctx;
  const plugin = getPlumeCodegenPlugin(component);
  if (plugin) {
    return plugin.genDefaultExternalProps(ctx, opts);
  }

  if (isPageComponent(ctx.component) && ctx.exportOpts.platform === "nextjs") {
    return `
      export interface ${makeDefaultExternalPropsName(component)} {
      }
    `;
  }

  const params = getExternalParams(ctx);
  return `
    export interface ${
      opts?.typeName ?? makeDefaultExternalPropsName(component)
    } {
      ${params
        .map(
          (param) =>
            `"${paramToVarName(ctx.component, param)}"?: ${serializeParamType(
              component,
              param,
              ctx.projectFlags
            )}`
        )
        .join(";\n")}
      className?: string;
  }`;
}

export function getExternalParams(ctx: SerializerBaseContext) {
  const argParams = getArgParams(ctx);
  const vgParams = getGenableVariantParams(ctx);
  return [...argParams, ...vgParams].filter(
    (p) =>
      ctx.exportOpts.forceAllProps || p.exportType === ParamExportType.External
  );
}

export function serializeArgsDefaultValues(ctx: SerializerBaseContext) {
  const argParams = getArgParams(ctx);
  const defaults: Record<string, string> = {};
  for (const param of argParams) {
    if (
      !isKnownStateParam(param) &&
      !isOnChangeParam(param, ctx.component) &&
      param.defaultExpr
    ) {
      const varName = paramToVarName(ctx.component, param);
      defaults[varName] = serializeNonParamExpr(ctx, param.defaultExpr, {
        forCodeComponent: false,
        localizable: param.isLocalizable,
        source: {
          type: "default-param-expr",
          projectId: ctx.projectConfig.projectId as ProjectId,
          site: ctx.site,
          component: ctx.component,
          attr: varName,
        },
      });
    }
  }
  return `{
    ${Object.entries(defaults)
      .map(([key, value]) => `"${key}": ${value},`)
      .join("\n")}
  }`;
}

/**
 * Generates typescript type definition for the component's variants arguments
 */
export function serializeVariantsArgsType(ctx: SerializerBaseContext) {
  const vgs = getGenableVariantGroups(ctx);
  const name = makeVariantsArgTypeName(ctx.component);
  return `
    export type ${makeVariantMembersTypeName(ctx.component)} = {
      ${vgs
        .map(
          (vg) =>
            `${toVarName(
              vg.param.variable.name
            )}: ${serializeVariantGroupMembersType(vg)};`
        )
        .join("\n")}
    };
    export type ${name} = ${serializeVariantsArgsTypeContent(vgs)};
    type VariantPropType = keyof ${name};
    export const ${makeVariantPropsName(
      ctx.component
    )} = new Array<VariantPropType>(${getParamNames(
    ctx.component,
    vgs.map((p) => p.param)
  )
    .map(jsLiteral)
    .join()});
  `;
}

export function serializeGlobalVariantsType(
  component: Component,
  groups: Set<VariantGroup>
) {
  const typeBody =
    groups.size === 0
      ? `{}`
      : `{
    ${[...groups]
      .map(
        (vg) =>
          `${toVarName(
            vg.param.variable.name
          )}: ${makeGlobalVariantGroupValueTypeName(vg)} | undefined`
      )
      .join(";\n")}
  }`;
  return `export type ${makeGlobalVariantsTypeName(component)} = ${typeBody};`;
}

function getArgsTypeContent(ctx: SerializerBaseContext) {
  const params = getArgParams(ctx);
  return params.length === 0
    ? "{}"
    : `{
    ${params
      .map(
        (p) =>
          `"${paramToVarName(ctx.component, p)}"?: ${serializeParamType(
            ctx.component,
            p,
            ctx.projectFlags
          )}`
      )
      .join(";\n")}
  }`;
}

export function serializeArgsType(ctx: SerializerBaseContext) {
  const name = makeArgsTypeName(ctx.component);
  return `
    export type ${name} = ${getArgsTypeContent(ctx)};
    type ArgPropType = keyof ${name};
    export const ${makeArgPropsName(ctx.component)} = new Array<ArgPropType>(
      ${
        ctx.exportOpts.shouldTransformWritableStates
          ? `"${makePlasmicIsPreviewRootComponent()}", `
          : ""
      }
      ${[
        ...getParamNames(ctx.component, getArgParams(ctx)).map(jsLiteral),
      ].join()});
  `;
}

export function serializeTriggersDefault(hookSpecs: ReactHookSpec[]) {
  const hookDefaults = hookSpecs.map(
    (spec) => `${spec.hookName}: ${spec.getReactHookDefaultValue()}`
  );
  return `{
    ${L.uniq(hookDefaults).join(",\n")}
  }`;
}

function serializeTriggersTypeBody(specs: ReactHookSpec[]) {
  return `{
    ${L.uniq(specs.map((spec) => `${spec.hookName}: boolean`)).join(";\n")}
  }`;
}

export function serializeTriggerStateType(
  component: Component,
  specs: ReactHookSpec[]
) {
  return `export type ${makeTriggerStateTypeName(
    component
  )} = ${serializeTriggersTypeBody(specs)}`;
}

function serializeSkeletonWrapperTs(
  ctx: SerializerBaseContext,
  opts: ExportOpts
) {
  const { component, nodeNamer } = ctx;

  const plugin = getPlumeCodegenPlugin(component);
  if (plugin) {
    return plugin.genSkeleton(ctx);
  }

  const plasmicComponentName = opts.idFileNames
    ? makeComponentRenderIdFileName(component)
    : makePlasmicComponentName(component);
  const componentName = getExportedComponentName(component);
  const nodeComponentName = makeNodeComponentName(component, "");
  const propsName = `${componentName}Props`;
  const genPropsName = makeDefaultExternalPropsName(component);

  const componentSubstitutionApi = opts.useComponentSubstitutionApi
    ? `import { components } from "@plasmicapp/loader-runtime-registry";

    ${
      isCodeComponent(component) && !isHostLessCodeComponent(component)
        ? "let __hasWarnedMissingCodeComponent = false;"
        : ""
    }

    export function getPlasmicComponent() {
      ${
        isCodeComponent(component) && !isHostLessCodeComponent(component)
          ? `if (!components["${
              component.uuid
            }"] && !__hasWarnedMissingCodeComponent) {
        console.warn("Warning: Code component ${getComponentDisplayName(
          component
        )} is not registered. Make sure to call \`PLASMIC.registerComponent\` for all used code components in your page.");
        __hasWarnedMissingCodeComponent = true;
      }`
          : ""
      }
      return components["${component.uuid}"] ?? ${componentName};
    }`
    : "";

  const codeComponentHelperRegistry =
    opts.useCodeComponentHelpersRegistry &&
    isCodeComponentWithHelpers(component)
      ? `import { codeComponentHelpers } from "@plasmicapp/loader-runtime-registry";

    export function getCodeComponentHelper() {
      return codeComponentHelpers["${component.uuid}"];
    }`
      : "";

  if (isPageComponent(component) && isPageAwarePlatform(opts.platform)) {
    const isNextjsAppDir = opts.platformOptions?.nextjs?.appDir || false;

    const globalGroups = ctx.site.globalVariantGroups.filter((g) => {
      // If we do have splits provider bundle we skip all the global groups associated with splits
      if (ctx.projectConfig.splitsProviderBundle) {
        return (
          g.variants.length > 0 &&
          !ctx.site.splits.some((split) => {
            return split.slices.some((slice) => {
              return slice.contents.some(
                (content) =>
                  isKnownGlobalVariantSplitContent(content) &&
                  content.group === g
              );
            });
          })
        );
      }
      return g.variants.length > 0;
    });

    const plasmicModuleImports = [nodeComponentName];
    let content = `<${nodeComponentName} />`,
      getStaticProps = "",
      componentPropsDecl = "",
      componentPropsSig = "";
    if (opts.platform === "nextjs") {
      if (isNextjsAppDir) {
        componentPropsSig = `{ params, searchParams }: {
  params?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, string | string[] | undefined>;
}`;
        content = `<PageParamsProvider__
          params={params}
          query={searchParams}
        >
          ${content}
        </PageParamsProvider__>`;
      } else {
        content = `<PageParamsProvider__
          route={useRouter()?.pathname}
          params={useRouter()?.query}
          query={useRouter()?.query}
        >
          ${content}
        </PageParamsProvider__>`;
      }
    } else if (opts.platform === "gatsby") {
      plasmicModuleImports.push("Head");
      componentPropsSig = `{ location, path, params }: PageProps`;
      content = `<PageParamsProvider__
        route={path}
        params={params}
        query={Object.fromEntries(new URLSearchParams(location.search))}
      >
        ${content}
      </PageParamsProvider__>`;
    }

    let globalContextsImport = "";
    if (
      opts.wrapPagesWithGlobalContexts &&
      ctx.site.globalContexts.length > 0
    ) {
      globalContextsImport = makeGlobalContextsImport(ctx.projectConfig);
      content = wrapGlobalContexts(content);
    }

    for (const globalGroup of globalGroups) {
      content = wrapGlobalProvider(globalGroup, content, false, []);
    }

    let globalGroupsComment = "";
    if (globalGroups.length > 0) {
      globalGroupsComment = `//
      // By default, ${nodeComponentName} is wrapped by your project's global
      // variant context providers. These wrappers may be moved to
      ${
        opts.platform === "nextjs"
          ? `// Next.js Custom App component
             // (https://nextjs.org/docs/advanced-features/custom-app).`
          : opts.platform === "gatsby"
          ? `// Gatsby "wrapRootElement" function
             // (https://www.gatsbyjs.com/docs/reference/config-files/gatsby-ssr#wrapRootElement).`
          : `// a component that wraps all page components of your application.`
      }`;
    }

    return `
      // This is a skeleton starter React page generated by Plasmic.
      // This file is owned by you, feel free to edit as you see fit.
      // plasmic-unformatted
      import * as React from "react";
      import { ${getHostNamedImportsForSkeleton()} } from "${getHostPackageName(
      opts
    )}";
      ${globalContextsImport}
      ${makeGlobalGroupImports(globalGroups, opts)}
      import {${plasmicModuleImports.join(", ")}} from "${
      opts.relPathFromImplToManagedDir
    }/${plasmicComponentName}";  // plasmic-import: ${component.uuid}/render
      ${
        isPageComponent(component) &&
        opts.platform === "nextjs" &&
        !isNextjsAppDir
          ? `import { useRouter } from "next/router";`
          : isPageComponent(component) && opts.platform === "gatsby"
          ? `import type { PageProps } from "gatsby";
          export { Head };`
          : ""
      }

      ${componentSubstitutionApi}

      ${getStaticProps}

      ${componentPropsDecl}

      function ${componentName}(${componentPropsSig}) {
        // Use ${nodeComponentName} to render this component as it was
        // designed in Plasmic, by activating the appropriate variants,
        // attaching the appropriate event handlers, etc.  You
        // can also install whatever React hooks you need here to manage state or
        // fetch data.
        //
        // Props you can pass into ${nodeComponentName} are:
        // 1. Variants you want to activate,
        // 2. Contents for slots you want to fill,
        // 3. Overrides for any named node in the component to attach behavior and data,
        // 4. Props to set on the root node.
        ${globalGroupsComment}
        return (${content});
      }

      export default ${componentName};
    `;
  }

  const rootTag = isTplTag(component.tplTree)
    ? component.tplTree.tag
    : undefined;

  const bodyComment = `
    // Use ${nodeComponentName} to render this component as it was
    // designed in Plasmic, by activating the appropriate variants,
    // attaching the appropriate event handlers, etc.  You
    // can also install whatever React hooks you need here to manage state or
    // fetch data.
    //
    // Props you can pass into ${nodeComponentName} are:
    // 1. Variants you want to activate,
    // 2. Contents for slots you want to fill,
    // 3. Overrides for any named node in the component to attach behavior and data,
    // 4. Props to set on the root node.
    //
    // By default, we are just piping all ${propsName} here, but feel free
    // to do whatever works for you.
  `;

  return `
    // This is a skeleton starter React component generated by Plasmic.
    // This file is owned by you, feel free to edit as you see fit.
    import * as React from "react";
    import {${nodeComponentName}, ${genPropsName}} from "${
    opts.relPathFromImplToManagedDir
  }/${plasmicComponentName}";  // plasmic-import: ${component.uuid}/render
    ${
      rootTag
        ? `import {HTMLElementRefOf} from "${getReactWebPackageName(opts)}";`
        : ""
    }

    ${componentSubstitutionApi}

    ${codeComponentHelperRegistry}

    // Your component props start with props for variants and slots you defined
    // in Plasmic, but you can add more here, like event handlers that you can
    // attach to named nodes in your component.
    //
    // If you don't want to expose certain variants or slots as a prop, you can use
    // Omit to hide them:
    //
    // interface ${propsName} extends Omit<${genPropsName}, "hideProps1"|"hideProp2"> {
    //   // etc.
    // }
    //
    // You can also stop extending from ${genPropsName} altogether and have
    // total control over the props for your component.
    export interface ${propsName} extends ${genPropsName} {
    }

    ${
      rootTag
        ? `
      function ${componentName}_(props: ${propsName}, ref: HTMLElementRefOf<${jsLiteral(
            rootTag
          )}>) {
        ${bodyComment}
        return <${nodeComponentName} ${nodeNamer(
            component.tplTree
          )}={{ref}} {...props} />;
      }

      const ${componentName} = React.forwardRef(${componentName}_);
      export default ${componentName};
    `
        : `
      function ${componentName}(props: ${propsName}) {
        ${bodyComment}
        return <${nodeComponentName} {...props} />;
      }

      export default ${componentName};
    `
    }
  `;
}

export function serializeVariantParamType(
  component: Component,
  variantVarName: string
) {
  return `${makeVariantsArgTypeName(component)}["${variantVarName}"]`;
}

/**
 * Outputs the typescript type for the argument Param
 */
export function serializeParamType(
  component: Component,
  param: Param,
  projectFlags: DevFlagsType
) {
  const variantGroup = findVariantGroupForParam(component, param);
  if (variantGroup) {
    // This param corresponds to a VariantGroup, so it's typed to the
    // VariantGroup's members
    return serializeVariantArgsGroupType(variantGroup);
  } else if (isImageType(param.type) && projectFlags.usePlasmicImg) {
    return `React.ComponentProps<typeof PlasmicImg__>["src"]`;
  } else if (isKnownFunctionType(param.type)) {
    return `(${param.type.params
      .map(
        (arg) =>
          `${toJsIdentifier(arg.argName)}: ${wabToTsType(arg.type, true)}`
      )
      .join(", ")}) => void`;
  } else {
    return `${wabToTsType(param.type, true)}`;
  }
}

function makeCodegenRuleNamer(ctx: SerializerBaseContext) {
  const { component, nodeNamer } = ctx;
  const classNamer = (tpl: TplNode, vs: VariantSetting) =>
    makeCssClassName(component, tpl, vs, nodeNamer, {
      targetEnv: ctx.exportOpts.targetEnv,
      useSimpleClassname: ctx.exportOpts.stylesOpts.scheme === "css-modules",
    });
  return makePseudoElementAwareRuleNamer(
    makePseudoClassAwareRuleNamer(component, makeBaseRuleNamer(classNamer))
  );
}

export function serializeCssRules(ctx: SerializerBaseContext) {
  const { component, site } = ctx;
  const buffer: string[] = [];
  const ruleNamer = makeCodegenRuleNamer(ctx);

  for (const node of ctx.componentGenHelper.flattenComponent(component)) {
    if (isTplTag(node) || isTplComponent(node) || isStyledTplSlot(node)) {
      const orderedVsettingsToGen = sortedVSettings(ctx, node).filter((vs) =>
        shouldGenVariantSetting(ctx, vs)
      );
      for (const vs of orderedVsettingsToGen) {
        if (isActiveVariantSetting(site, vs)) {
          const rules = showSimpleCssRuleSet(
            ctx.componentGenHelper,
            node,
            vs,
            ruleNamer,
            {
              targetEnv: ctx.exportOpts.targetEnv,
              useCssModules: ctx.exportOpts.stylesOpts.scheme === "css-modules",
              whitespaceNormal: !!ctx.exportOpts.whitespaceNormal,
              useCssFlexGap: ctx.exportOpts.stylesOpts.useCssFlexGap,
            }
          );
          buffer.push(...tryAugmentRulesWithScreenVariant(rules, vs));
        }
      }
    }
  }
  return buffer.join("\n");
}

export function getGenableVariantGroups(ctx: SerializerBaseContext) {
  return ctx.component.variantGroups.filter(
    (vg) =>
      vg.variants.length > 0 &&
      (ctx.exportOpts.forceAllProps ||
        vg.param.exportType !== ParamExportType.ToolsOnly)
  );
}

export function getGenableVariantParams(ctx: SerializerBaseContext) {
  return getGenableVariantGroups(ctx).map((vg) => vg.param);
}

export function getArgParams(ctx: SerializerBaseContext) {
  const params = getNonVariantParams(ctx.component);
  return params.filter(
    (p) =>
      ctx.exportOpts.forceAllProps || p.exportType !== ParamExportType.ToolsOnly
  );
}

/**
 * Extracts list of Components that are referenced by the tree of the argument
 * `component`
 * @param component
 */
export function extractReferencedComponents(component: Component) {
  return L.uniq(
    flattenTpls(component.tplTree)
      .filter(isTplComponent)
      .map((tpl) => tpl.component)
  );
}

export function serializeDescendantsLookup(ctx: SerializerBaseContext) {
  const namedNodes = getNamedDescendantNodes(
    ctx.nodeNamer,
    ctx.component.tplTree
  );
  const nodeNamer = ctx.nodeNamer;

  // For compability, we should keep addressing previous default names
  const getDescendantNodeName = (tpl: TplTag | TplComponent) => {
    const nodeName = nodeNamer(tpl);
    return [
      jsLiteral(nodeName),
      ...(nodeName && !tpl.name && nodeName in nodeNameBackwardsCompatibility
        ? ensureArray(nodeNameBackwardsCompatibility[nodeName]).map(
            (prevNodeName) => jsLiteral(prevNodeName)
          )
        : []),
    ].join(", ");
  };

  // When targeting loader, we play more fast and loose and just
  // serialize a flat list of descendant names rather than a tree
  // of descendants, to save some bytes. Essentially, we allow
  // any named node as a descendant of any node.
  const serializedDescendants =
    ctx.exportOpts.targetEnv === "loader"
      ? jsLiteral(namedNodes.map((node) => nodeNamer(node)))
      : `{
    ${namedNodes
      .map(
        (node) =>
          `${nodeNamer(node)}: [${getNamedDescendantNodes(ctx.nodeNamer, node)
            .map((x) => getDescendantNodeName(x))
            .join(", ")}],`
      )
      .join("\n")}
  }`;
  return `
    const ${makeDescendantsName()} = ${serializedDescendants} as const;
    type NodeNameType = keyof typeof ${makeDescendantsName()};
    type DescendantsType<T extends NodeNameType> = ${
      ctx.exportOpts.targetEnv === "loader"
        ? `(typeof ${makeDescendantsName()})[number]`
        : `(typeof ${makeDescendantsName()})[T][number]`
    };
    type NodeDefaultElementType = {
      ${namedNodes
        .map(
          (node) =>
            `${nodeNamer(node)}: ${serializeDefaultElementType(ctx, node)}`
        )
        .join(";\n")}
    };
  `;
}

function conditionalTagAttrs(
  ctx: SerializerBaseContext,
  node: TplTag,
  orderedVsettings: VariantSetting[]
) {
  const attr2variant: Record<string, [Expr, VariantCombo][]> = {};
  for (const vs of orderedVsettings) {
    for (const [key, val] of Object.entries(vs.attrs)) {
      withDefault(attr2variant, key, []).push([val, vs.variants]);
    }
  }
  return conditionalProps(ctx, attr2variant, node, {
    forCodeComponent: false,
    localizableProps: Object.keys(attr2variant).filter((attr) =>
      LOCALIZABLE_HTML_ATTRS.includes(attr)
    ),
  });
}

function conditionalComponentArgs(
  ctx: SerializerBaseContext,
  node: TplComponent
) {
  const component = node.component;
  const param2variant: Record<string, [Expr, VariantCombo][]> = {};

  const params = [
    ...getRealParams(component),
    ...getVariantParams(component),
  ].filter(
    (p) =>
      ctx.exportOpts.forceAllProps || p.exportType === ParamExportType.External
  );
  const passedToCodeComponent = isCodeComponent(component);
  const variantArgNames = new Set<string>();
  for (const vs of getOrderedExplicitVSettings(ctx, node)) {
    for (const attrName of L.keys(vs.attrs)) {
      const expr = vs.attrs[attrName];
      if (isAttrEventHandler(attrName)) {
        const entry = withDefault(param2variant, attrName, []);
        entry.push([expr, vs.variants]);
      } else {
        // Some parameters are stored in attributes section.
        const param = params.find((p) => p.variable.name === attrName);
        if (!param) {
          continue;
        }
        const varName = paramToVarName(component, param);
        const entry = withDefault(param2variant, varName, []);
        entry.push([expr, vs.variants]);
      }
    }
    for (const arg of vs.args) {
      if (!params.includes(arg.param)) {
        continue;
      }
      const varName = paramToVarName(component, arg.param);
      const entry = withDefault(param2variant, varName, []);
      const r = tryGetVariantGroupValueFromArg(component, arg);
      if (!r) {
        if (
          isKnownColorPropType(arg.param.type) &&
          isKnownStyleTokenRef(arg.expr) &&
          !arg.param.type.noDeref
        ) {
          const token = arg.expr.token;
          const conditionals = buildConditionalDerefTokenValueArg(
            ctx.site,
            token
          );
          entry.push([
            toCode(
              joinVariantVals(
                conditionals.map(([expr, combo]) => [
                  getRawCode(expr, ctx.exprCtx),
                  combo,
                ]),
                ctx.variantComboChecker,
                "undefined"
              ).value
            ),
            vs.variants,
          ]);
        } else {
          entry.push([arg.expr, vs.variants]);
        }
      } else {
        variantArgNames.add(varName);
        if (isKnownCustomCode(arg.expr) || isKnownObjectPath(arg.expr)) {
          entry.push([arg.expr, vs.variants]);
        } else if (r.vg.multi) {
          entry.push([
            jsonLit(r.variants.map((v) => toVarName(v.name))),
            vs.variants,
          ]);
        } else if (r.variants.length > 0) {
          assert(
            r.variants.length === 1,
            `Unexpected ${r.variants.length} variants passed to non-multi variant group ${r.vg.param.variable.name}`
          );
          if (isStandaloneVariantGroup(r.vg)) {
            entry.push([codeLit(true), vs.variants]);
          } else {
            entry.push([codeLit(toVarName(r.variants[0].name)), vs.variants]);
          }
        } else {
          entry.push([codeLit(undefined), vs.variants]);
        }
      }
    }
  }

  if (passedToCodeComponent) {
    params.forEach((p) => {
      const varName = paramToVarName(component, p);
      if (p.defaultExpr) {
        const entry = withDefault(param2variant, varName, []);
        if (
          !entry.some(([_expr, variantCombo]) => isBaseVariant(variantCombo))
        ) {
          entry.unshift([p.defaultExpr, [getBaseVariant(component)]]);
        }
      } else if (isKnownStyleScopeClassNamePropType(p.type)) {
        const className = makeStyleScopeClassName(
          node,
          makeCodegenRuleNamer(ctx),
          p.type.scopeName
        );
        param2variant[varName] = [
          [
            toCode(makeSerializedClassNameRef(ctx, className)),
            [getBaseVariant(component)],
          ],
        ];
      } else if (isKnownDefaultStylesClassNamePropType(p.type)) {
        const rootExprs = serializeComponentRootResetClasses(
          ctx,
          p.type.includeTagStyles
        );
        const className = serializeClassNamesCall(
          rootExprs.unconditionalClassExprs,
          rootExprs.conditionalClassExprs
        );
        param2variant[varName] = [
          [toCode(className), [getBaseVariant(component)]],
        ];
      } else if (isKnownDefaultStylesPropType(p.type)) {
        param2variant[varName] = buildConditionalDefaultStylesPropArg(ctx.site);
      }
    });
  }

  const attrs = conditionalProps(ctx, param2variant, node, {
    forCodeComponent: passedToCodeComponent,
    localizableProps: params
      .filter((p) => p.isLocalizable)
      .map((p) => paramToVarName(component, p)),
  });

  return { variantArgNames, attrs };
}

function getSerializedImgSrcForAsset(
  asset: ImageAsset,
  ctx: SerializerBaseContext,
  asStringUrl = false
) {
  let srcStr: string | undefined = undefined;

  if (asset.dataUri && ctx.exportOpts.imageOpts.scheme === "files") {
    srcStr = `${makeImportedPictureRef(asset)}`;
  } else if (
    asset.dataUri &&
    ctx.exportOpts.imageOpts.scheme === "public-files"
  ) {
    srcStr = `${jsLiteral(makePictureRefToken(asset))}`;
  }

  if (asStringUrl) {
    return srcStr ?? jsLiteral(asset.dataUri ?? "");
  }

  const maybeSrcObject = maybeMakePlasmicImgSrc(asset, ctx.exprCtx);
  if (srcStr) {
    if (typeof maybeSrcObject === "object" && maybeSrcObject) {
      // We need to replace `maybeSrcObject.src` by `srcStr`. However, we
      // can't call jsLiteral on it, since `srcStr` is either a js variable name
      // or a string already in the js literal format. So we will manually
      // JSON-stringify this object:
      return `{ ${Object.entries(maybeSrcObject)
        .map(
          ([key, value]) =>
            `${jsLiteral(key)}:${key === "src" ? srcStr : jsLiteral(value)}`
        )
        .join(", ")} }`;
    }
    return srcStr;
  }
  return jsLiteral(maybeSrcObject ?? "");
}

function conditionalStyleProp(
  ctx: SerializerBaseContext,
  node: TplNode,
  orderedVsettings: VariantSetting[],
  prop: string,
  transform?: (val?: string) => string | undefined
) {
  const exprCombos: [Expr, VariantCombo][] = withoutNils(
    orderedVsettings.map((vs) => {
      const rs = RSH(vs.rs, node);
      if (rs.has(prop)) {
        const val = rs.getRaw(prop);
        return [codeLit(transform ? transform(val) : val), vs.variants];
      } else if (isBaseVariant(vs.variants)) {
        // For base variant, use the default value
        const defaultVal = rs.get(prop);
        return [
          codeLit(transform ? transform(defaultVal) : defaultVal),
          vs.variants,
        ];
      } else {
        return undefined;
      }
    })
  );

  return conditionalValue(ctx, prop, exprCombos, node, {
    localizable: false,
  });
}

function conditionalProps(
  ctx: SerializerBaseContext,
  prop2ExprVariant: Record<string, [Expr, VariantCombo][]>,
  node: TplNode,
  opts: {
    forCodeComponent: boolean;
    localizableProps: string[];
  }
) {
  return L.mapValues(
    prop2ExprVariant,
    (vals: [Expr, VariantCombo][], prop: string) => {
      return conditionalValue(ctx, prop, vals, node, {
        localizable: opts.localizableProps.includes(prop),
      });
    }
  );
}

function serializeNonParamExpr(
  ctx: SerializerBaseContext,
  expr: Expr,
  opts: {
    forCodeComponent: boolean;
    localizable: boolean;
    source: LocalizableStringSource;
  }
) {
  const param = extractReferencedParam(ctx.component, expr);
  assert(
    !param,
    "serializeExpr can not be used with exprs referencing component params"
  );
  if (
    isKnownImageAssetRef(expr) &&
    expr.asset.type === ImageAssetType.Picture
  ) {
    return getSerializedImgSrcForAsset(expr.asset, ctx, opts.forCodeComponent);
  } else if (isKnownStyleExpr(expr)) {
    const className = makeStyleExprClassName(expr);
    return makeSerializedClassNameRef(ctx, className);
  } else if (ctx.projectFlags.usePlasmicTranslation && opts.localizable) {
    const lit = tryExtractJson(expr);
    if (lit && typeof lit === "string") {
      const key = makeLocalizationStringKey(lit, opts.source, {
        keyScheme: ctx.exportOpts.localization?.keyScheme ?? "content",
        tagPrefix: ctx.exportOpts.localization?.tagPrefix,
      });
      return `($translator?.(${jsLiteral(key)}) ?? ${jsLiteral(lit)})`;
    } else {
      return getRawCode(expr, ctx.exprCtx, {
        fallbackSerializer: (fallback) =>
          serializeNonParamExpr(ctx, fallback, opts),
      });
    }
  } else {
    return getRawCode(expr, ctx.exprCtx, {
      fallbackSerializer: (fallback) =>
        serializeNonParamExpr(ctx, fallback, opts),
    });
  }
}

function makeSerializedClassNameRef(
  ctx: SerializerBaseContext,
  className: string,
  importedStyleObj = "sty"
) {
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  return useCssModules
    ? `${importedStyleObj}[${jsLiteral(className)}]`
    : jsLiteral(className);
}

function conditionalValue(
  ctx: SerializerBaseContext,
  prop: string,
  exprCombos: [Expr, VariantCombo][],
  node: TplNode,
  opts: {
    localizable: boolean;
  }
) {
  const serializeExpr = (expr: Expr, combo: VariantCombo) => {
    // If this expr is referencing a component param, then look up the arg value
    // in the args variable (set up in serializeRenderWrapperTs).  Else assume
    // that this is just literal code.
    const param = extractReferencedParam(ctx.component, expr);
    if (param) {
      const varName = paramToVarName(ctx.component, param);
      const argsVarName = varName.includes("-")
        ? `args["${varName}"]`
        : `args.${varName}`;
      if (param.type.name === "img") {
        // argsVarName right now is an image asset object. If we're passing to
        // a code component, code components expect imageUrl props to be just
        // a string.
        if (isKnownTplComponent(node) && isCodeComponent(node.component)) {
          return `${argsVarName}.src`;
        }
      }
      return `${argsVarName}`;
    } else {
      return serializeNonParamExpr(ctx, expr, {
        forCodeComponent:
          isTplComponent(node) && isCodeComponent(node.component),
        source: {
          type: "attr",
          projectId: ctx.projectConfig.projectId as ProjectId,
          site: ctx.site,
          component: ctx.component,
          tpl: node,
          variantCombo: combo,
          attr: prop,
        },
        localizable: opts.localizable,
      });
    }
  };
  const serializedExprCombos = exprCombos.map(([expr, variantCombo]) => {
    try {
      const serializedExpr = serializeExpr(expr, variantCombo);
      return tuple(serializedExpr, variantCombo);
    } catch (error) {
      if (error instanceof UnexpectedTypeError) {
        error.message = [
          error.message,
          `site=${ctx.site.uid}`,
          `expr.uid=${expr.uid}`,
          `property=${prop}`,
          `ownerComponent=${ctx.component.name}`,
          `variantCombo=${variantCombo.map((v) => v.name).join(",")}`,
        ].join(",");
      }
      throw error;
    }
  });
  if (
    isTplComponent(node) &&
    exprCombos.some(([expr]) => isKnownStyleExpr(expr))
  ) {
    // For StyleExpr, passed to a ClassNamePropType, we serialize the
    // result as a classNames(...), because we want to apply all the class names
    // where the variant combo evaluates to true, not just the first one
    // that evaluates to true (which is what joinVariantVals does).
    const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
    const conditionalClassExprs = serializedExprCombos.map(([sexpr, combo]) =>
      tuple(
        useCssModules ? `[${sexpr}]` : sexpr,
        ctx.variantComboChecker(combo)
      )
    );
    return serializeClassNamesCall([], conditionalClassExprs);
  }
  return joinVariantVals(
    serializedExprCombos,
    ctx.variantComboChecker,
    "undefined"
  ).value;
}

/**
 * Returns a conditional string that strings together the argument `exprs`,
 * like this:
 *
 *   hasVariant(var1) ? expr1 : hasVariant(var2) ? expr2 : hasVariant(var3) ?
 * expr3 : defaultExpr
 *
 * The order of exprs is from base to specific
 */
function joinVariantVals(
  exprs: [string, VariantCombo][],
  variantComboChecker: VariantComboChecker,
  defaultExpr: string
) {
  // We go from highest specificity to lowest; the last here should be the base variant
  exprs = arrayReversed(exprs);
  const last = L.last(exprs);
  let indexOfUncondValue = -1;
  if (last && isBaseVariant(last[1])) {
    // If the last is indeed base variant, which always evaluates to true,
    // we just use its expression as the defaultExpr and skip the variant
    // check.  This avoids always having a `true ? xxx : ""` at the end
    exprs = exprs.slice(0, exprs.length - 1);
    defaultExpr = last[0];
    indexOfUncondValue = 0;
  }

  // If there's no exprs, then just return defaultExpr directly.  Because of the mutation
  // earlier in this function, this defaultExpr may actually be the expr associated
  // with the base variant.
  if (exprs.length === 0) {
    return { value: defaultExpr, conditional: false, indexOfUncondValue };
  }

  const value =
    exprs
      .map(
        ([expr, variantCombo]) =>
          `${variantComboChecker(variantCombo)} ? ${expr}`
      )
      .join(" : ") + ` : ${defaultExpr}`;
  return { value, conditional: true, indexOfUncondValue };
}

/**
 * Returns a version of `name` that we can set as property on the primary
 * export -- the functional component.  `name` must already be a valid js
 * identifier.
 */
function ensureValidFunctionPropName(name: string) {
  if (["name", "arguments", "caller", "displayName", "length"].includes(name)) {
    // We prepend "_".  There won't be collisions, since toJsIdentifier strips prefix _.
    return `_${name}`;
  } else {
    return name;
  }
}

export function serializePlasmicSuperContext(ctx: SerializerBaseContext) {
  const { component } = ctx;
  if (component.subComps.length === 0) {
    return "";
  }
  return `const ${makePlasmicSuperContextName(
    component
  )} = React.createContext<undefined|{variants: ${makeVariantsArgTypeName(
    component
  )}, args: ${makeArgsTypeName(component)}}>(undefined);`;
}

export function makeSuperCompImports(component: Component, opts: ExportOpts) {
  const superComps = getSuperComponents(component);

  return superComps
    .map(
      (superComp) => `
    import SUPER__${makePlasmicComponentName(superComp)} from "./${
        opts.idFileNames
          ? makeComponentRenderIdFileName(superComp)
          : makePlasmicComponentName(superComp)
      }";  // plasmic-import: ${superComp.uuid}/render
  `
    )
    .join("\n");
}

export function getReactWebPackageName(opts: { skinnyReactWeb?: boolean }) {
  return `@plasmicapp/react-web${opts.skinnyReactWeb ? "/skinny" : ""}`;
}

function getHostPackageName(opts: {
  importHostFromReactWeb?: boolean;
  platformOptions?: ExportPlatformOptions;
}) {
  // For some reason Next.js with app directory doesn't like the subpath.
  // TODO: Figure out what's wrong with Next.js app directory.
  if (opts.importHostFromReactWeb && !opts.platformOptions?.nextjs?.appDir) {
    // Codegen use case; import from react-web instead of having users
    // install @plasmicapp/host separately
    return `@plasmicapp/react-web/lib/host`;
  } else {
    // Loader use case; import from @plasmicapp/host, which will be swapped
    // out at run time
    return `@plasmicapp/host`;
  }
}

function getPlasmicAuthPackageName(opts: {
  importHostFromReactWeb?: boolean;
  platformOptions?: ExportPlatformOptions;
}) {
  // Same as getHostPackageName
  if (opts.importHostFromReactWeb && !opts.platformOptions?.nextjs?.appDir) {
    return `@plasmicapp/react-web/lib/auth`;
  } else {
    return `@plasmicapp/auth-react`;
  }
}

const PLUME_TYPE_TO_PACKAGE_FOLDER: Record<PlumeType, string> = {
  button: "button",
  checkbox: "checkbox",
  menu: "menu",
  "menu-button": "menu-button",
  "menu-group": "menu",
  "menu-item": "menu",
  select: "select",
  "select-option": "select",
  "select-option-group": "select",
  switch: "switch",
  "text-input": "text-input",
  "triggered-overlay": "triggered-overlay",
};
export function getPlumePackageName(opts: ExportOpts, plumeType: PlumeType) {
  if (!opts.skinnyReactWeb) {
    return "@plasmicapp/react-web";
  }
  return `@plasmicapp/react-web/skinny/dist/plume/${PLUME_TYPE_TO_PACKAGE_FOLDER[plumeType]}`;
}

export function getDataSourcesPackageName() {
  return "@plasmicapp/react-web/lib/data-sources";
}

export function serializedKeyValue(key: string, val: string): string {
  if (!key.match(/^[A-Za-z_$]/) || !!key.match(/[^\w-$]/)) {
    return `{...{${jsLiteral(key)}: ${val}}}`;
  }
  return `${key}={${val}}`;
}

export function serializedKeyValueForObject(key: string, val: string): string {
  if (!key.match(/^[A-Za-z_$]/) || !!key.match(/[^\w-$]/)) {
    return `"${jsLiteral(key)}": ${val}`;
  }
  return `"${key}": ${val}`;
}

function buildConditionalDefaultStylesPropArg(
  site: Site
): [Expr, VariantCombo][] {
  const combos = getRelevantVariantCombosForTheme(site);
  return [
    [codeLit(makeDefaultStyleValuesDict(site, [])), []],
    ...(combos.map((combo) => [
      codeLit(makeDefaultStyleValuesDict(site, combo)),
      combo,
    ]) as [Expr, VariantCombo][]),
  ];
}

function buildConditionalDerefTokenValueArg(
  site: Site,
  token: StyleToken
): [Expr, VariantCombo][] {
  const combos = getRelevantVariantCombosForToken(site, token);
  const resolver = makeTokenValueResolver(site);

  const getTokenValue = (combo: VariantCombo) => {
    const vsh = new VariantedStylesHelper(site, combo);
    return resolver(token, vsh);
  };

  return [
    [codeLit(getTokenValue([])), []],
    ...(combos.map((combo) => [codeLit(getTokenValue(combo)), combo]) as [
      Expr,
      VariantCombo
    ][]),
  ];
}

export function makeCodeComponentHelperImportName(
  c: CodeComponentWithHelpers,
  opts: ExportOpts,
  aliases: ImportAliasesMap
) {
  if (opts.useCodeComponentHelpersRegistry && !isHostLessCodeComponent(c)) {
    return `{ getCodeComponentHelper as getCodeComponentHelper__${getImportedComponentName(
      aliases,
      c
    )}}`;
  } else {
    return `{ ${getCodeComponentHelperImportName(
      c
    )} as ${getImportedCodeComponentHelperName(aliases, c)}}`;
  }
}

export function makeComponentImportName(
  c: Component,
  aliases: ImportAliasesMap,
  opts: ExportOpts
) {
  const aliasedName = aliases.get(c) || getExportedComponentName(c);
  if (opts.useComponentSubstitutionApi && !isHostLessCodeComponent(c)) {
    return `{ getPlasmicComponent as getPlasmicComponent__${aliasedName} }`;
  }
  if (isCodeComponent(c)) {
    if (isHostLessCodeComponent(c) && opts.defaultExportHostLessComponents) {
      return aliasedName;
    }
    if (
      (!isHostLessCodeComponent(c) && opts.codeComponentStubs) ||
      c.codeComponentMeta.defaultExport
    ) {
      // For code component stubs, we always just use the aliasedName.
      // This is currently used by PlasmicLoader, which expects the
      // all components to be the default export.
      return aliasedName;
    } else if (aliases.has(c)) {
      return `{ ${getExportedComponentName(c)} as ${aliases.get(c)}}`;
    } else {
      return `{ ${getExportedComponentName(c)} }`;
    }
  } else {
    return aliasedName;
  }
}

export function makePageMetadataOutput(
  ctx: SerializerBaseContext
): PageMetadata | undefined {
  const { component } = ctx;
  if (!component.pageMeta) {
    return undefined;
  }
  return {
    path: component.pageMeta?.path as string,
    description: component.pageMeta?.description,
    title: component.pageMeta?.title,
    canonical: component.pageMeta?.canonical,
    openGraphImageUrl: getOgImageLink(ctx, component.pageMeta?.openGraphImage),
  };
}

export function makeSplitsProviderBundle(
  site: Site,
  projectId: string,
  opts: Partial<ExportOpts>
) {
  if (site.splits.length === 0) {
    return undefined;
  }

  const runningSplits = site.splits.filter(
    (s) => s.status === SplitStatus.Running
  );

  const referencedGlobalVariantGroups = site.globalVariantGroups.filter(
    (vg) => {
      return runningSplits.some((s) => {
        return s.slices.some((slice) => {
          return slice.contents.some((content) => {
            if (isKnownGlobalVariantSplitContent(content)) {
              return content.group === vg;
            }
            return false;
          });
        });
      });
    }
  );

  let content = `{children}`;

  for (const globalVariantGroup of referencedGlobalVariantGroups) {
    content = wrapGlobalProviderWithCustomValue(
      globalVariantGroup,
      content,
      false,
      `getGlobalContextValueFromVariation("${globalVariantGroup.uuid}", variation)`
    );
  }

  // This should be a codegen exclusive module that shouldn't be included in loader bundle

  const module = `
    // @ts-nocheck
    /* eslint-disable */
    /* tslint:disable */
    // This class is auto-generated by Plasmic; please do not edit!
    // Plasmic Project: ${projectId}
    ${makeUseClient(opts)}
    import * as React from "react";
    import { getActiveVariation } from "@plasmicapp/react-web/lib/splits";
    ${makeGlobalGroupImports(referencedGlobalVariantGroups)}

    type GetActiveVariationParams = Partial<
      Parameters<typeof getActiveVariation>[0]
    >;

    export interface PlasmicSplitsProviderProps extends GetActiveVariationParams {
      children?: React.ReactNode;
    };

    export const splits = ${JSON.stringify(
      exportActiveSplitsConfig(site, projectId)
    )};

    export function getGlobalContextValueFromVariation(groupId: string, variation: Record<string, string>) {
      let groupValue: string | undefined = undefined;
      Object.keys(variation).forEach((variationKey: string) => {
        const [_type, splitId] = variationKey.split(".");
        const sliceId = variation[variationKey];
        const split = splits.find(
          (s) => s.id === splitId || s.externalId === splitId
        );
        if (split) {
          const slice = split.slices.find(
            (s) => s.id === sliceId || s.externalId === sliceId
          );
          if (slice) {
            const content = slice.contents.find(
              (c) => c.groupId === groupId
            );
            if (content) {
              groupValue = content.variant;
            }
          }
        }
      });
      return groupValue;
    };

    export default function PlasmicSplitsProvider(props: PlasmicSplitsProviderProps) {
      const { children, traits, ...rest } = props;
      const variation = getActiveVariation({
        splits,
        traits: traits ?? {},
        ...rest,
      });

      return (
        <>
          ${content}
        </>
      );
    };
  `;

  return {
    id: projectId,
    module,
  };
}
