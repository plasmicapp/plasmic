import { arrayReversed } from "@/wab/commons/collections";
import { makeTokenValueResolver } from "@/wab/shared/cached-selectors";
import {
  CodeComponentWithHelpers,
  isCodeComponentWithHelpers,
} from "@/wab/shared/code-components/code-components";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import { makeCodeComponentHelperImportName } from "@/wab/shared/codegen/react-p/code-components";
import { ReactHookSpec } from "@/wab/shared/codegen/react-p/react-hook-spec";
import {
  getExportedComponentName,
  makeCodeComponentHelperSkeletonIdFileName,
  makeComponentRenderIdFileName,
  makeComponentSkeletonIdFileName,
  makePlasmicComponentName,
  makeVariantsArgTypeName,
  NodeNamer,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  ImportAliasesMap,
  SerializerBaseContext,
  VariantComboChecker,
} from "@/wab/shared/codegen/react-p/types";
import { ExportOpts, ExportPlatformOptions } from "@/wab/shared/codegen/types";
import { jsLiteral } from "@/wab/shared/codegen/util";
import { assert, ensure, tuple } from "@/wab/shared/common";
import {
  getCodeComponentHelperImportName,
  isCodeComponent,
  isHostLessCodeComponent,
} from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import {
  getRelevantVariantCombosForTheme,
  getRelevantVariantCombosForToken,
  getTriggerableSelectors,
  makeDefaultStyleValuesDict,
} from "@/wab/shared/core/styles";
import { findVariantSettingsUnderTpl } from "@/wab/shared/core/tpls";
import {
  Component,
  Expr,
  Site,
  StyleToken,
  TplNode,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { PlumeType } from "@/wab/shared/plume/plume-registry";
import { sortedVariantSettings } from "@/wab/shared/variant-sort";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  hasStyleOrCodeComponentVariant,
  isActiveVariantSetting,
  isBaseVariant,
  isStyleVariant,
  VariantCombo,
} from "@/wab/shared/Variants";
import L from "lodash";

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
    (v) => isStyleVariant(v) && getTriggerableSelectors(v).length > 0
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

function shouldGenVariant(ctx: SerializerBaseContext, v: Variant) {
  const vg = v.parent;
  return (
    !vg ||
    ctx.exportOpts.forceAllProps ||
    vg.param.exportType !== ParamExportType.ToolsOnly
  );
}

export function shouldGenVariantSetting(
  ctx: SerializerBaseContext,
  vs: VariantSetting
) {
  return (
    isActiveVariantSetting(ctx.site, vs) &&
    vs.variants.every((v) => shouldGenVariant(ctx, v))
  );
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
      (!hasStyleOrCodeComponentVariant(vs.variants) ||
        shouldGenReactHook(vs, ctx.component) ||
        isTplRootWithCodeComponentVariants(ctx.component.tplTree))
  );
  return res;
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
export function joinVariantVals(
  exprs: [string, VariantCombo][],
  variantComboChecker: VariantComboChecker,
  defaultExpr: string
) {
  // We go from highest specificity to lowest; the last here should be the base variant
  exprs = arrayReversed(exprs);
  const lastExpr = L.last(exprs);
  let indexOfUncondValue = -1;
  if (lastExpr && isBaseVariant(lastExpr[1])) {
    // If the last is indeed base variant, which always evaluates to true,
    // we just use its expression as the defaultExpr and skip the variant
    // check.  This avoids always having a `true ? xxx : ""` at the end
    exprs = exprs.slice(0, exprs.length - 1);
    defaultExpr = lastExpr[0];
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

export function sortedVSettings(ctx: SerializerBaseContext, node: TplNode) {
  return sortedVariantSettings(node.vsettings, ctx.variantComboSorter);
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
export function isReactComponent(elementType: string): boolean {
  if (elementType.includes(".")) {
    return true;
  }

  return elementType.charAt(0).toUpperCase() === elementType.charAt(0);
}

/**
 * Returns a version of `name` that we can set as property on the primary
 * export -- the functional component.  `name` must already be a valid js
 * identifier.
 */
export function ensureValidFunctionPropName(name: string) {
  if (["name", "arguments", "caller", "displayName", "length"].includes(name)) {
    // We prepend "_".  There won't be collisions, since toJsIdentifier strips prefix _.
    return `_${name}`;
  } else {
    return name;
  }
}

export function getReactWebPackageName(opts: { skinnyReactWeb?: boolean }) {
  return `@plasmicapp/react-web${opts.skinnyReactWeb ? "/skinny" : ""}`;
}

export function getHostPackageName(opts: {
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

export function buildConditionalDefaultStylesPropArg(
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

export function buildConditionalDerefTokenValueArg(
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
