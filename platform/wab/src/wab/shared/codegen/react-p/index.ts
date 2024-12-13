import { AppAuthProvider, ProjectId } from "@/wab/shared/ApiSchema";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import {
  getSlotParams,
  isStyledTplSlot,
  isTplPlainText,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantCombo,
  getBaseVariant,
  isActiveVariantSetting,
  isBaseVariant,
  isCodeComponentVariant,
  isGlobalVariant,
  isStandaloneVariantGroup,
  isStyleVariant,
} from "@/wab/shared/Variants";
import { componentToReferenced } from "@/wab/shared/cached-selectors";
import {
  getBuiltinComponentRegistrations,
  isBuiltinCodeComponent,
} from "@/wab/shared/code-components/builtin-code-components";
import { isCodeComponentWithHelpers } from "@/wab/shared/code-components/code-components";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
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
import {
  getPlasmicAuthPackageName,
  serializeWithPlasmicPageGuard,
  serializeWithUsePlasmicAuth,
  shouldWrapWithPageGuard,
  shouldWrapWithUsePlasmicAuth,
} from "@/wab/shared/codegen/react-p/auth";
import {
  makeCssClassName,
  makeSerializedClassNameRef,
  serializeClassNames,
  serializeClassNamesCall,
  serializeComponentRootResetClasses,
} from "@/wab/shared/codegen/react-p/class-names";
import {
  generateCodeComponentsHelpersFromRegistry,
  serializeCodeComponentVariantsTriggers,
} from "@/wab/shared/codegen/react-p/code-components";
import { nodeNameBackwardsCompatibility } from "@/wab/shared/codegen/react-p/constants";
import { serializeCustomFunctionsAndLibs } from "@/wab/shared/codegen/react-p/custom-functions";
import { serializeDataConds } from "@/wab/shared/codegen/react-p/data-conds";
import {
  serializeDataReps,
  serializeDataRepsIndexName,
} from "@/wab/shared/codegen/react-p/data-reps";
import {
  getDataSourcesPackageName,
  serializeComponentLevelQuery,
} from "@/wab/shared/codegen/react-p/data-sources";
import { reactWebExportedFiles } from "@/wab/shared/codegen/react-p/exported-react-web/files";
import { makeGlobalContextBundle } from "@/wab/shared/codegen/react-p/global-context";
import {
  getUsedGlobalVariantGroups,
  serializeGlobalVariantValues,
} from "@/wab/shared/codegen/react-p/global-variants";
import { optimizeGeneratedCodeForHostlessPackages } from "@/wab/shared/codegen/react-p/optimize-hostless-packages";
import {
  makePageMetadataOutput,
  renderPageHead,
  serializePageMetadata,
} from "@/wab/shared/codegen/react-p/page-metadata";
import {
  getExternalParams,
  serializeArgsDefaultValues,
  serializeArgsType,
  serializeNonParamExpr,
  serializeParamType,
  serializeVariantsArgsType,
} from "@/wab/shared/codegen/react-p/params";
import { ReactHookSpec } from "@/wab/shared/codegen/react-p/react-hook-spec";
import {
  NodeNamer,
  asOneNode,
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
  makeComponentCssIdFileName,
  makeComponentRenderIdFileName,
  makeCssFileName,
  makeCssProjectFileName,
  makeCssProjectIdFileName,
  makeDefaultExternalPropsName,
  makeDefaultInlineClassName,
  makeDefaultStyleClassNameBase,
  makeDefaultStyleCompWrapperClassName,
  makeDescendantsName,
  makeGlobalContextsImport,
  makeGlobalGroupImports,
  makeNodeComponentName,
  makeOverridesTypeName,
  makePlasmicComponentName,
  makePlasmicDefaultStylesClassName,
  makePlasmicMixinsClassName,
  makePlasmicSuperContextName,
  makePlasmicTokensClassName,
  makePlatformImports,
  makeRenderFuncName,
  makeRootResetClassName,
  makeStylesImports,
  makeUseClient,
  makeVariantPropsName,
  makeVariantsArgTypeName,
  makeWabHtmlTextClassName,
  maybeCondExpr,
  wrapGlobalContexts,
  wrapGlobalProvider,
  wrapInDataCtxReader,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { makeSplitsProviderBundle } from "@/wab/shared/codegen/react-p/splits";
import {
  serializeInitFunc,
  serializeStateSpecs,
} from "@/wab/shared/codegen/react-p/states";
import {
  makeSuperCompImports,
  serializePlasmicSuperContext,
} from "@/wab/shared/codegen/react-p/super-context";
import { serializeTplTextBlockContent } from "@/wab/shared/codegen/react-p/text";
import {
  SerializerBaseContext,
  SerializerSiteContext,
} from "@/wab/shared/codegen/react-p/types";
import {
  buildConditionalDefaultStylesPropArg,
  buildConditionalDerefTokenValueArg,
  deriveReactHookSpecs,
  ensureValidFunctionPropName,
  generateReferencedImports,
  generateSubstituteComponentCalls,
  getHostPackageName,
  getOrderedExplicitVSettings,
  getPlumePackageName,
  getReactWebPackageName,
  isReactComponent,
  joinVariantVals,
  makeChildrenStr,
  serializedKeyValue,
  serializedKeyValueForObject,
  shouldGenVariantSetting,
  sortedVSettings,
} from "@/wab/shared/codegen/react-p/utils";
import {
  CodegenScheme,
  ComponentExportOutput,
  ExportOpts,
  ProjectConfig,
  StyleConfig,
} from "@/wab/shared/codegen/types";
import {
  jsLiteral,
  jsString,
  paramToVarName,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import { makeGlobalVariantGroupImportTemplate } from "@/wab/shared/codegen/variants";
import {
  UnexpectedTypeError,
  assert,
  ensure,
  ensureArray,
  isNonNil,
  tuple,
  uniqueName,
  withDefault,
  withDefaultFunc,
  withoutNils,
} from "@/wab/shared/common";
import {
  PageComponent,
  getComponentDisplayName,
  getRealParams,
  getRepetitionIndexName,
  getSuperComponentVariantToComponent,
  getSuperComponents,
  getVariantParams,
  hasDataSourceInteractions,
  hasGlobalActions,
  hasLoginInteractions,
  isCodeComponent,
  isHostLessCodeComponent,
  isPageComponent,
  tryGetVariantGroupValueFromArg,
} from "@/wab/shared/core/components";
import {
  codeLit,
  extractReferencedParam,
  getRawCode,
  jsonLit,
  code as toCode,
} from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import {
  allImageAssets,
  allImportedStyleTokensWithProjectInfo,
  allMixins,
  allStyleTokens,
} from "@/wab/shared/core/sites";
import {
  getComponentStateOnChangePropNames,
  getLastPartOfImplicitStateName,
  getStateDisplayName,
  getStateOnChangePropName,
  getStateValuePropName,
  getStateVarName,
  isReadonlyState,
  isWritableState,
} from "@/wab/shared/core/states";
import {
  TPL_COMPONENT_PROPS,
  plasmicImgAttrStyles,
} from "@/wab/shared/core/style-props";
import {
  CssVarResolver,
  makeBaseRuleNamer,
  makeCssTokenVarsRules,
  makeDefaultStylesRules,
  makeLayoutVarsRules,
  makeMixinVarsRules,
  makePseudoClassAwareRuleNamer,
  makePseudoElementAwareRuleNamer,
  makeStyleScopeClassName,
  mkComponentRootResetRule,
  mkThemeStyleRule,
  showSimpleCssRuleSet,
  tryAugmentRulesWithScreenVariant,
} from "@/wab/shared/core/styles";
import {
  TplTagType,
  TplTextTag,
  flattenTpls,
  flattenTplsWithoutThrowawayNodes,
  isAttrEventHandler,
  isTplCodeComponent,
  isTplComponent,
  isTplImage,
  isTplNamable,
  isTplSlot,
  isTplTag,
  isTplTagOrComponent,
  isTplTextBlock,
  summarizeTpl,
  tplHasRef,
} from "@/wab/shared/core/tpls";
import { tryGetBrowserCssInitial } from "@/wab/shared/css";
import {
  DEVFLAGS,
  applyPlasmicUserDevFlagOverrides,
  getProjectFlags,
} from "@/wab/shared/devflags";
import { exprUsesCtxOrFreeVars } from "@/wab/shared/eval/expression-parser";
import { LOCALIZABLE_HTML_ATTRS } from "@/wab/shared/localization";
import {
  Component,
  Expr,
  ImageAssetRef,
  Param,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantSetting,
  ensureKnownNamedState,
  ensureKnownVariantGroup,
  isKnownColorPropType,
  isKnownCustomCode,
  isKnownDefaultStylesClassNamePropType,
  isKnownDefaultStylesPropType,
  isKnownGlobalVariantSplitContent,
  isKnownImageAssetRef,
  isKnownNamedState,
  isKnownObjectPath,
  isKnownRenderExpr,
  isKnownRenderFuncType,
  isKnownStyleExpr,
  isKnownStyleScopeClassNamePropType,
  isKnownStyleTokenRef,
  isKnownTplComponent,
  isKnownTplTag,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import {
  PlumeType,
  getPlumeCodegenPlugin,
} from "@/wab/shared/plume/plume-registry";
import {
  deriveSizeStyleValue,
  getPageComponentSizeType,
} from "@/wab/shared/sizingutils";
import { JsIdentifier } from "@/wab/shared/utils/regex-js-identifier";
import { makeVariantComboSorter } from "@/wab/shared/variant-sort";
import L from "lodash";
import { shouldUsePlasmicImg } from "src/wab/shared/codegen/react-p/image";
import type { SetRequired } from "type-fest";

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
  const loaderCssInfix =
    exportOpts?.targetEnv === "loader" ? projectId.slice(0, 5) : undefined;

  const resolver = new CssVarResolver(
    allStyleTokens(site, { includeDeps: "all" }),
    allMixins(site, { includeDeps: "all" }),
    allImageAssets(site, { includeDeps: "all" }),
    site.activeTheme,
    {
      useCssVariables: true,
      cssVariableInfix: loaderCssInfix,
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
      cssVariableInfix: loaderCssInfix,
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
  };
}

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
      // One should only call variantChecker on style variants for non-css
      // variantSettings.
      const hook = ensure(
        reactHookSpecs.find((spec) => spec.sv === variant),
        `Missing reactHookSpec for variant ${variant.name} (uuid: ${variant.uuid})`
      );
      return hook.serializeIsTriggeredCheck(triggersRef);
    } else if (isCodeComponentVariant(variant)) {
      return variant.codeComponentVariantKeys
        .map((key) => {
          return `$ccVariants[${jsString(key)}]`;
        })
        .join(" && ");
    } else {
      return nonStyleVariantChecker(variant);
    }
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
  return go((x) => x.uid);
}

export function makeNodeNamerFromMap(uidToName: Record<number, string>) {
  return (node: TplNode) => uidToName[node.uid];
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

      const args = React.useMemo(() => Object.assign(${serializedArgs}, Object.fromEntries(
          Object.entries(props.args).filter(([_, v]) => v !== undefined)
        )),
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
  const ccVariantTriggers = serializeCodeComponentVariantsTriggers(
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
    ${ccVariantTriggers}
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
  builtinEventHandlers: Record<string, string[]>,
  onChangeAttrs: Set<JsIdentifier> = new Set()
) {
  const chainedFunctionCall = (code: string) =>
    `(${code}).apply(null, eventArgs);`;

  // When dealing with event handlers for plasmic state updates, we won't call the user's event handler
  // during the state initialization phase. This is provided by the second argument of the event handler
  // which is a boolean indicating whether the onChange event is triggered during the state initialization phase.
  const maybeHaltUserAttr = (attr: string) => {
    if (onChangeAttrs.has(toJsIdentifier(attr))) {
      return `if(eventArgs.length > 1 && eventArgs[1]) {
  return;
}`;
    }
    return "";
  };

  const chained = (
    attr: string,
    attrBuiltinEventHandlers: string[],
    userAttr: string[]
  ) => {
    return `async (...eventArgs: any) => {
        ${attrBuiltinEventHandlers.map(chainedFunctionCall).join("\n")}

        ${maybeHaltUserAttr(attr)}

        ${userAttr.map(chainedFunctionCall).join("\n")}
      }`;
  };

  for (const key of Object.keys(builtinEventHandlers)) {
    userAttrs[key] = chained(
      key,
      withoutNils(builtinEventHandlers[key]),
      withoutNils([userAttrs[key]])
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

    mergeEventHandlers(
      attrs,
      builtinEventHandlers,
      getComponentStateOnChangePropNames(ctx.component, node)
    );
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

  if (isRoot && isTplRootWithCodeComponentVariants(node)) {
    attrs["plasmicUpdateVariant"] = `updateVariant`;
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
 * Returns code that creates the argument nodes list.  If there's more
 * than one node, then a Fragment is created to wrap them.
 */
function serializeTplNodesAsArray(
  ctx: SerializerBaseContext,
  nodes: TplNode[]
) {
  return nodes.map((child) => ctx.serializeTplNode(ctx, child));
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
