import { VariantGroupType } from "@/wab/shared/Variants";
import { CodeComponentWithHelpers } from "@/wab/shared/code-components/code-components";
import { PlasmicImportType } from "@/wab/shared/codegen/react-p/types";
import { makeChildrenStr } from "@/wab/shared/codegen/react-p/utils";
import {
  CodegenScheme,
  ExportOpts,
  ExportPlatform,
  ProjectConfig,
} from "@/wab/shared/codegen/types";
import {
  jsLiteral,
  stripExtension,
  toClassName,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  makeGlobalVariantGroupContextProviderName,
  makeGlobalVariantGroupFileName,
} from "@/wab/shared/codegen/variants";
import { ensure } from "@/wab/shared/common";
import {
  getCodeComponentImportName,
  getSuperComponents,
  isCodeComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { CssProjectDependencies } from "@/wab/shared/core/sites";
import {
  Component,
  ImageAsset,
  TplNode,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import L, { lowerFirst } from "lodash";
import type { SetRequired } from "type-fest";

export const globalStyleCssImportName = "globalcss";
export const projectStyleCssImportName = "projectcss";
export const defaultStyleCssImportName = "defaultcss";
export const defaultStyleCssFileName = "plasmic__default_style.css";

export const plasmicTokensClassNameKey = "plasmic_tokens";

export function makeWabInstanceClassName(opts: Pick<ExportOpts, "targetEnv">) {
  return opts.targetEnv === "loader"
    ? `${shortPlasmicPrefix}i`
    : "__wab_instance";
}

export function makeWabSlotClassName(opts: Pick<ExportOpts, "targetEnv">) {
  return opts.targetEnv === "loader" ? `${shortPlasmicPrefix}s` : "__wab_slot";
}

export function makeWabSlotStringWrapperClassName(
  opts: Pick<ExportOpts, "targetEnv">
) {
  return opts.targetEnv === "loader"
    ? `${shortPlasmicPrefix}sw`
    : "__wab_slot-string-wrapper";
}

export function makeWabTextClassName(opts: Pick<ExportOpts, "targetEnv">) {
  return opts.targetEnv === "loader" ? `${shortPlasmicPrefix}t` : "__wab_text";
}

export function makeWabHtmlTextClassName(opts: Pick<ExportOpts, "targetEnv">) {
  return opts.targetEnv === "loader"
    ? `${shortPlasmicPrefix}th`
    : "__wab_expr_html_text";
}

export function makeDefaultStyleClassNameBase(
  opts: Pick<ExportOpts, "targetEnv">
) {
  return opts.targetEnv === "loader"
    ? `${shortPlasmicPrefix}d`
    : "plasmic_default";
}

export function makeDefaultStyleCompWrapperClassName(
  opts: Pick<ExportOpts, "targetEnv">
) {
  return `${makeDefaultStyleClassNameBase(opts)}${
    opts.targetEnv === "loader" ? "c" : "__component_wrapper"
  }`;
}

export function makeDefaultInlineClassName(
  opts: Pick<ExportOpts, "targetEnv">
) {
  return `${makeDefaultStyleClassNameBase(opts)}${
    opts.targetEnv === "loader" ? "n" : "__inline"
  }`;
}

export function makeCssProjectImportName(projectName: string) {
  return `plasmic_${L.snakeCase(projectName)}_css`;
}

/**
 * Elements with this class will reset styling to the project's default styles,
 * as defined by `plasmic_default_styles`. This class is intended to be applied
 * to all Plasmic-generated elements.
 *
 * This class name may also be suffixed with `_tags`. Unlike `root_reset`,
 * which only applies to the selected element, `root_reset_tags` applies to the
 * selected element AND its descendants. This class is never set on elements
 * by Plasmic-generated code. Instead, this class is passed to the user's code
 * component via the `themeResetClass` prop when `targetAllTags: true`.
 */
export function makeRootResetClassName(
  projectId: string,
  opts: SetRequired<Partial<ExportOpts>, "targetEnv">
) {
  const useCssModules = opts.stylesOpts?.scheme === "css-modules";
  if (useCssModules) {
    return "root_reset";
  } else {
    if (opts.targetEnv === "loader") {
      return `${shortPlasmicPrefix}r-${projectId.slice(0, 5)}`;
    } else {
      return `root_reset_${projectId}`;
    }
  }
}

/**
 * Elements with this class will receive the project's default styles as
 * CSS variables.
 *
 * The CSS variables are intended to be consumed by the `root_reset` and
 * `root_reset_tags` classes. Users should not depend on these CSS variables.
 *
 * Example output:
 * ```
 * .plasmic_default_styles {
 *   --mixin-proj123_font-family: "Inter", "sans-serify";
 *   --mixin-proj123_color: var(--token-token123);
 * }
 * ```
 */
export function makePlasmicDefaultStylesClassName(
  opts: Pick<ExportOpts, "targetEnv">
) {
  return opts.targetEnv === "loader"
    ? `${shortPlasmicPrefix}dss`
    : "plasmic_default_styles";
}

/**
 * Elements with this class will receive the project's tokens as CSS variables.
 *
 * The CSS variables are intended to be consumed both by Plasmic generated code
 * and user code.
 *
 * Example output:
 * ```
 * .plasmic_tokens {
 *   --token-token123: #ffffff;
 *   --plasmic-token-background: var(--token-token123);
 *   --token-token456: #000000;
 *   --plasmic-token-foreground: var(--token-token456);
 * }
 * ```
 */
export function makePlasmicTokensClassName(
  projectId: string,
  opts: SetRequired<Partial<ExportOpts>, "targetEnv">,
  hasStyleTokenOverrides
) {
  const useCssModules = opts?.stylesOpts?.scheme === "css-modules";
  if (useCssModules) {
    return plasmicTokensClassNameKey;
  } else {
    if (opts.targetEnv === "loader") {
      if (hasStyleTokenOverrides) {
        return `${shortPlasmicPrefix}tns-${projectId.slice(0, 5)}`;
      } else {
        return `${shortPlasmicPrefix}tns`;
      }
    } else {
      return `${plasmicTokensClassNameKey}_${projectId}`;
    }
  }
}

/**
 * Elements with this class will receive the project's mixins as CSS variables.
 *
 * The CSS variables are intended to be consumed both by Plasmic generated code
 * and user code.
 *
 * Example output:
 * ```
 * .plasmic_mixins {
 *   --mixin-mixin123_color: red;
 *   --plasmic-mixin-alert_color: var(--mixin-mixin123_color);
 *   --mixin-mixin123_font-size: 16px;
 *   --plasmic-mixin-alert_font-size: var(--mixin-mixin123_font-size);
 *   --mixin-mixin456_white-space: pre-wrap;
 *   --plasmic-mixin-code-space: var(--mixin-mixin456_white-space);
 * }
 * ```
 */
export function makePlasmicMixinsClassName(
  opts: Pick<ExportOpts, "targetEnv">
) {
  return opts.targetEnv === "loader"
    ? `${shortPlasmicPrefix}mns`
    : "plasmic_mixins";
}

export const shortPlasmicPrefix = "ρ";

export type NodeNamer = (node: TplNode) => string | undefined;

export function makeStylesImports(
  cssProjectDependencies: CssProjectDependencies,
  component: Component,
  projectConfig: ProjectConfig,
  opts: ExportOpts,
  scheme: CodegenScheme = "blackbox"
) {
  const useCssModules = opts.stylesOpts.scheme === "css-modules";
  const cssImport = (name: string, path: string) => {
    // Gatsby >= 3 expects CSS modules to be imported using star (i.e.,
    // "import * as name from ...") while CRA >= 5 / Next.js does not support that
    // (requiring "import name from ...").
    const importName = !useCssModules
      ? opts.platform === "tanstack"
        ? `${name} from`
        : ""
      : opts.platform === "gatsby"
      ? `* as ${name} from`
      : `${name} from`;

    /* Tanstack doesn't support CSS modules in SSR at the moment so the only option
     * that we have is to import css as a URL.
     * https://github.com/TanStack/router/issues/3023
     */
    const importPath = `${stripExtension(path, true)}${
      useCssModules
        ? ".module.css"
        : opts.platform === "tanstack"
        ? ".css?url"
        : ".css"
    }`;
    return `import ${importName} "./${importPath}"`;
  };

  return `
    ${
      opts.stylesOpts.skipGlobalCssImport
        ? ""
        : opts.platform === "tanstack"
        ? `import ${globalStyleCssImportName} from "@plasmicapp/react-web/lib/plasmic.css?url";`
        : `import "@plasmicapp/react-web/lib/plasmic.css";`
    }
    ${
      // Only import defaultcss if we're not using CSS modules. If we are
      // using CSS modules, defaultcss will be in projectcss.
      useCssModules
        ? ""
        : `${cssImport(
            defaultStyleCssImportName,
            defaultStyleCssFileName
          )}; // plasmic-import: global/${defaultStyleCssImportName}`
    }
    ${cssImport(
      projectStyleCssImportName,
      projectConfig.cssFileName
    )}; // plasmic-import: ${
    projectConfig.projectId
  }/${projectStyleCssImportName}
    ${cssImport(
      "sty",
      opts.idFileNames
        ? makeComponentCssIdFileName(component)
        : scheme === "blackbox"
        ? makePlasmicComponentName(component)
        : getExportedComponentName(component)
    )} // plasmic-import: ${component.uuid}/css
  `;
}

export function makeUseClient(opts: Partial<ExportOpts>): string {
  if (opts?.platform === "nextjs" && opts.platformOptions?.nextjs?.appDir) {
    // Only add "use client" for Next.js app/ dir projects.
    // For other projects, the presence of this directive may cause unwanted warnings from bundlers.
    // In the future when server components are more widespread, we can remove the conditional.
    return `"use client";`;
  } else {
    return "";
  }
}

export function makePlatformImports(opts: ExportOpts): string {
  if (opts.platform === "gatsby") {
    return `
      import { Link, GatsbyLinkProps as LinkProps, navigate as __gatsbyNavigate } from "gatsby";
    `;
  } else if (opts.platform === "nextjs") {
    // Next.js has multiple routing hooks depending on your Next.js version and pages/ or app/ dir:
    // * next/router - all recent Next.js versions, but only works for pages/
    // * next/navigation - Next.js 13+, works for both pages/ and app/
    //
    // The APIs are similar (but not the exact same!), so we switch it here at the import.
    // When generating code that uses this hook, make sure that it works for both.
    // https://beta.nextjs.org/docs/upgrade-guide#step-5-migrating-routing-hooks
    if (opts.platformOptions?.nextjs?.appDir) {
      return `
      import Head from "next/head";
      import Link, { LinkProps } from "next/link";
      import { useRouter } from "next/navigation";
    `;
    } else {
      return `
      import Head from "next/head";
      import Link, { LinkProps } from "next/link";
      import { useRouter } from "next/router";
    `;
    }
  } else if (opts.platform === "tanstack") {
    return `
      import { useRouter, Link } from "@tanstack/react-router";
      import type { LinkProps } from "@tanstack/react-router";
    `;
  } else {
    return "";
  }
}

export function getPlatformImportComponents(platform: ExportPlatform) {
  const names: string[] = [];
  if (platform === "nextjs") {
    names.push("Link", "LinkProps", "Head");
  }
  if (platform === "gatsby") {
    names.push("Link", "LinkProps");
  }
  if (platform === "tanstack") {
    names.push("Link", "LinkProps");
  }
  return names;
}

export function getExportedComponentName(component: Component) {
  if (isCodeComponent(component)) {
    return getSingleExportedComponentName(component);
  }
  return [...getSuperComponents(component), component]
    .map(getSingleExportedComponentName)
    .join("__");
}

function getSingleExportedComponentName(component: Component) {
  if (isCodeComponent(component)) {
    return getCodeComponentImportName(component);
  }
  return getNormalizedComponentName(component);
}

export function getNormalizedComponentName(component: Component) {
  if (isCodeComponent(component)) {
    return component.name;
  }
  if (component.name) {
    const className = toClassName(component.name);
    if (className) {
      return className;
    }
  }
  return toClassName(`Component${component.uuid}`);
}

export function isPageAwarePlatform(platform: string) {
  return (
    platform === "nextjs" || platform === "gatsby" || platform === "tanstack"
  );
}

export function getSkeletonModuleFileName(
  component: Component,
  opts: ExportOpts
): string {
  if (opts.idFileNames) {
    return `${makeComponentSkeletonIdFileName(component)}.tsx`;
  }
  if (isPageComponent(component) && isPageAwarePlatform(opts.platform)) {
    const path = component.pageMeta?.path;
    if (path) {
      if (path === "/" || path.endsWith("/index")) {
        return `${L.trim(path, "/")}/index.tsx`;
      } else {
        return `${L.trim(path, "/")}.tsx`;
      }
    }
  }

  return `${getExportedComponentName(component)}.tsx`;
}

export function makeGlobalContextPropName(
  comp: Component,
  aliases?: Map<Component, string>
) {
  let componentName: string;
  if (aliases?.get(comp)) {
    componentName = aliases.get(comp)!;
  } else {
    componentName =
      comp.codeComponentMeta?.importName ??
      toJsIdentifier(comp.name, { capitalizeFirst: true });
    if (comp.codeComponentMeta?.defaultExport) {
      componentName = toClassName(componentName);
    }
  }
  return `${lowerFirst(componentName)}Props`;
}

export function makeGlobalContextsImport(projectConfig: ProjectConfig) {
  return `import GlobalContextsProvider from "./PlasmicGlobalContextsProvider"; // plasmic-import: ${projectConfig.globalContextBundle?.id}/globalContext`;
}

export function wrapGlobalContexts(content: string) {
  return `<GlobalContextsProvider>
  ${content}
  </GlobalContextsProvider>`;
}

export function wrapStyleTokensProvider(content: string) {
  return `<${makeStyleTokensProviderName()}>
    ${content}
  </${makeStyleTokensProviderName()}>`;
}

export function makeStyleTokensProviderImports(
  styleTokensProviderBundle: ProjectConfig["styleTokensProviderBundle"],
  imports: {
    styleTokensProvider?: boolean;
    useStyleTokens?: boolean;
  },
  depProjectInfo?: {
    projectId: string;
    projectName: string;
  }
) {
  const importNames: string[] = [];
  if (imports.styleTokensProvider) {
    importNames.push(makeStyleTokensProviderName());
  }
  if (imports.useStyleTokens) {
    let name = makeUseStyleTokensName();
    if (depProjectInfo) {
      name += ` as ${makeUseStyleTokensNameForDep(depProjectInfo.projectName)}`;
    }
    importNames.push(name);
  }
  if (importNames.length === 0) {
    return "";
  }
  return makeTaggedPlasmicImport(
    importNames,
    styleTokensProviderBundle!.fileName,
    depProjectInfo?.projectId ?? styleTokensProviderBundle!.id,
    "styleTokensProvider"
  );
}

export function makeProjectModuleImports(
  projectModuleBundle: ProjectConfig["projectModuleBundle"]
) {
  return makeTaggedPlasmicImport(
    makeUseGlobalVariantsName(),
    projectModuleBundle!.fileName,
    projectModuleBundle!.id,
    "projectModule"
  );
}

export function makeGlobalGroupImports(
  globalGroups: VariantGroup[],
  opts: { idFileNames?: boolean } = {}
) {
  return (
    globalGroups
      // Filter out global screens, since they don't use a context provider
      .filter((vg) => vg.type !== VariantGroupType.GlobalScreen)
      .map((vg) => {
        const groupFileName = opts.idFileNames
          ? makeGlobalVariantIdFileName(vg)
          : makeGlobalVariantGroupFileName(vg);

        return `import {${makeGlobalVariantGroupContextProviderName(
          vg
        )}} from "./${stripExtension(groupFileName)}"; // plasmic-import: ${
          vg.uuid
        }/globalVariant`;
      })
      .join("\n")
  );
}

export function wrapGlobalProvider(
  vg: VariantGroup,
  content: string,
  curlyBrackets: boolean,
  activeVariants: Variant[]
): string {
  if (vg.type === VariantGroupType.GlobalScreen) {
    // We don't need to wrap ScreenVariantProvider anymore
    return content;
  } else {
    const contextProviderName = makeGlobalVariantGroupContextProviderName(vg);
    const value =
      activeVariants.length === 0
        ? "undefined"
        : vg.multi
        ? jsLiteral(activeVariants.map((v) => toVarName(v.name)))
        : jsLiteral(toVarName(activeVariants[0].name));
    return `
      <${contextProviderName} value={${value}}>
        ${curlyBrackets ? "{" : ""}
        ${content}
        ${curlyBrackets ? "}" : ""}
      </${contextProviderName}>
    `;
  }
}

export function wrapGlobalProviderWithCustomValue(
  vg: VariantGroup,
  content: string,
  curlyBrackets: boolean,
  value: string
): string {
  if (vg.type === VariantGroupType.GlobalScreen) {
    // We don't need to wrap ScreenVariantProvider anymore
    return content;
  } else {
    const contextProviderName = makeGlobalVariantGroupContextProviderName(vg);
    return `
      <${contextProviderName} value={${value}}>
        ${curlyBrackets ? "{" : ""}
        ${content}
        ${curlyBrackets ? "}" : ""}
      </${contextProviderName}>
    `;
  }
}

export function makeVariantsArgTypeName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__VariantsArgs`;
}

export function makeVariantMembersTypeName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__VariantMembers`;
}

export function makePlasmicComponentName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}`;
}

export function makeDefaultExternalPropsName(component: Component) {
  return `Default${getExportedComponentName(component)}Props`;
}

export function makePlasmicIsPreviewRootComponent() {
  return `__plasmicIsPreviewRoot`;
}

export function makeArgsTypeName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__ArgsType`;
}

export function makeOverridesTypeName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__OverridesType`;
}

export function makeGlobalVariantsTypeName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__GlobalVariantsType`;
}

export function makeVariantPropsName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__VariantProps`;
}

export function makeArgPropsName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__ArgProps`;
}

export function makeTriggerStateTypeName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__TriggerStateType`;
}

// Node components are in pascal case to avoid eslint warnings. See
// https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/jsx-pascal-case.md
export function makeNodeComponentName(component: Component, nodeName: string) {
  return `Plasmic${getExportedComponentName(component)}${L.upperFirst(
    nodeName
  )}`;
}

export function getImportedComponentName(
  aliases: Map<Component | ImageAsset, string>,
  component: Component
) {
  if (aliases.has(component)) {
    return ensure(
      aliases.get(component),
      "Aliases are expected to contain component (that was checked one line above)"
    );
  }
  if (isCodeComponent(component)) {
    return getCodeComponentImportName(component);
  }
  return getExportedComponentName(component);
}

export function getImportedCodeComponentHelperName(
  aliases: Map<Component | ImageAsset, string>,
  c: CodeComponentWithHelpers
) {
  return `${getImportedComponentName(aliases, c)}_Helpers`;
}

export function makeTanStackHeadOptionsExportName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__HeadOptions`;
}

export function makeRenderFuncName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}__RenderFunc`;
}

export function makeDescendantsName() {
  return `PlasmicDescendants`;
}

export function makePlasmicSuperContextName(component: Component) {
  return `${makePlasmicComponentName(component)}Context`;
}

export function makeComponentSkeletonIdFileName(component: Component) {
  return `comp__${component.uuid}`;
}

export function makeCodeComponentHelperSkeletonIdFileName(
  component: Component
) {
  return `compHelper__${component.uuid}`;
}

export function makeComponentRenderIdFileName(component: Component) {
  return `render__${component.uuid}`;
}

export function makeComponentCssIdFileName(component: Component) {
  return `css__${component.uuid}`;
}

export function makeAssetIdFileName(asset: ImageAsset) {
  return `${asset.type}__${asset.uuid}`;
}

export function makeGlobalVariantIdFileName(group: VariantGroup) {
  return `global__${group.uuid}`;
}

export function makeCreateUseGlobalVariantsName() {
  return `createUseGlobalVariants`;
}

export function makeCreateStyleTokensProviderName() {
  return "createStyleTokensProvider";
}

export function makeStyleTokensProviderName() {
  return "StyleTokensProvider";
}

export function makeCreateUseStyleTokensName() {
  return "createUseStyleTokens";
}

export function makeUseGlobalVariantsName() {
  return "_useGlobalVariants";
}

export function makeStyleTokensClassNames() {
  return "styleTokensClassNames";
}

export function makeStyleTokensClassNamesForDep(projectName: string) {
  return `${makeStyleTokensClassNames()}_${L.snakeCase(projectName)}`;
}

export function makeUseStyleTokensName() {
  return "_useStyleTokens";
}

export function makeUseStyleTokensNameForDep(projectName: string) {
  return `useStyleTokens_${L.snakeCase(projectName)}`;
}

export function makeProjectModuleFileName(
  projectId: string,
  opts: Pick<ExportOpts, "targetEnv">
) {
  return opts.targetEnv === "loader"
    ? `project__${projectId.slice(0, 5)}.tsx`
    : "plasmic.tsx";
}

export function makeStyleTokensProviderFileName(
  projectId: string,
  opts: Pick<ExportOpts, "targetEnv">
) {
  return opts.targetEnv === "loader"
    ? `styleTokensProvider__${projectId.slice(0, 5)}.tsx`
    : "PlasmicStyleTokensProvider.tsx";
}

export function makeCssProjectFileName() {
  return `plasmic`;
}

export function makeCssProjectIdFileName(projectId: string) {
  return `project_${projectId}`;
}

export function makeCssFileName(
  baseName: string,
  exportOpts?: Partial<ExportOpts>
) {
  const useCssModules = exportOpts?.stylesOpts?.scheme === "css-modules";
  return `${baseName}${useCssModules ? ".module.css" : ".css"}`;
}

export function getReactWebNamedImportsForRender() {
  return `Flex as Flex__,
  MultiChoiceArg,
  PlasmicDataSourceContextProvider as PlasmicDataSourceContextProvider__,
  PlasmicIcon as PlasmicIcon__,
  PlasmicImg as PlasmicImg__,
  PlasmicLink as PlasmicLink__,
  PlasmicPageGuard as PlasmicPageGuard__,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
  Stack as Stack__,
  StrictProps,
  Trans as Trans__,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  generateOnMutateForSpec,
  generateStateOnChangeProp,
  generateStateOnChangePropForCodeComponents,
  generateStateValueProp,
  get as $stateGet,
  hasVariant,
  initializeCodeComponentStates,
  initializePlasmicStates,
  makeFragment,
  omit,
  pick,
  renderPlasmicSlot,
  set as $stateSet,
  useCurrentUser,
  useDollarState,
  usePlasmicTranslator,
  useTrigger,
  wrapWithClassName,
  `;
}

export function getHostNamedImportsForRender() {
  return `
  DataCtxReader as DataCtxReader__,
  useDataEnv,
  useGlobalActions,
  `;
}

export function getHostNamedImportsForSkeleton() {
  return `
  PageParamsProvider as PageParamsProvider__,
  `;
}

export function wrapInDataCtxReader(nodeStr: string) {
  // nodeStr may be a single React element, or a code expression
  // (for example, if child is a repeated element).
  return `<DataCtxReader__>{
    ($ctx) => (${nodeStr})
  }</DataCtxReader__>`;
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

export const maybeCondExpr = (maybeCond: string, expr: string) => {
  if (!maybeCond) {
    return expr;
  }
  return `(${maybeCond}) ? (${expr}) : null`;
};

/**
 * Makes an import with tag that Plasmic CLI can interpret.
 * @param source - if file name, adds "./" automatically
 */
export function makeTaggedPlasmicImport(
  imports: string | string[],
  source: string,
  id: string,
  type: PlasmicImportType
) {
  if (Array.isArray(imports)) {
    imports = imports.join(", ");
  }
  return makeTaggedPlasmicImportRaw(`{ ${imports} }`, source, id, type);
}

/**
 * Makes an import with tag that Plasmic CLI can interpret.
 * @param source - if file name, adds "./" automatically
 */
export function makeTaggedPlasmicStarImport(
  importName: string,
  source: string,
  id: string,
  type: PlasmicImportType
) {
  return makeTaggedPlasmicImportRaw(`* as ${importName}`, source, id, type);
}

function makeTaggedPlasmicImportRaw(
  imports: string,
  source: string,
  id: string,
  type: PlasmicImportType
) {
  if (
    !source.startsWith(".") &&
    (source.endsWith(".css") ||
      source.endsWith(".ts") ||
      source.endsWith(".tsx"))
  ) {
    source = `./${source}`;
  }
  return `import ${imports} from "${source}"; // plasmic-import: ${id}/${type}`;
}
