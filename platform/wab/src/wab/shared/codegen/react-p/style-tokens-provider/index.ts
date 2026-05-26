import { ProjectId } from "@/wab/shared/ApiSchema";
import { isValidComboForToken } from "@/wab/shared/Variants";
import {
  makeCssClassNameForVariantCombo,
  serializeGlobalCssClass,
} from "@/wab/shared/codegen/react-p/class-names";
import { getContextGlobalVariantsWithVariantedTokens } from "@/wab/shared/codegen/react-p/global-variants";
import {
  makeCreateStyleTokensProviderName,
  makeCreateUseStyleTokensName,
  makePlasmicModulePrelude,
  makePlasmicTokensClassName,
  makePlasmicTokensOverrideClassName,
  makeProjectCssFileName,
  makeProjectModuleImports,
  makeStyleTokensProviderFileName,
  makeStyleTokensProviderName,
  makeTaggedPlasmicDefaultImport,
  makeUseGlobalVariantsName,
  makeUseStyleTokensName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { getReactWebPackageName } from "@/wab/shared/codegen/react-p/utils";
import {
  ExportOpts,
  ProjectModuleBundle,
  StyleTokensProviderBundle,
} from "@/wab/shared/codegen/types";
import {
  embedInTemplateString,
  jsLiteral,
  toVarName,
  wrapInTemplateString,
} from "@/wab/shared/codegen/util";
import { assert, ensure } from "@/wab/shared/common";
import { CssProjectDependencies } from "@/wab/shared/core/sites";
import { Site } from "@/wab/shared/model/classes";
import {
  makeGlobalVariantComboSorter,
  sortedVariantCombos,
} from "@/wab/shared/variant-sort";
import type { SetRequired } from "type-fest";

export function makeStyleTokensProviderBundle(
  site: Site,
  projectId: ProjectId,
  cssProjectDependencies: CssProjectDependencies,
  projectModuleBundle: ProjectModuleBundle,
  exportOpts: SetRequired<Partial<ExportOpts>, "targetEnv">
): StyleTokensProviderBundle {
  const hasStyleTokenOverrides = site.styleTokenOverrides.length > 0;

  // project plasmic_tokens_override
  const overridesClassName = serializeGlobalCssClass(
    makePlasmicTokensOverrideClassName(projectId, exportOpts)
  );
  // The root project may override tokens,
  // and the overridden value might reference tokens from the root project.
  //
  // Therefore, we need to include all token classes accessible to the root project
  // so that the dependency can de-ref the overridden values when wrapped by the root's StyleTokensProvider
  //
  // We also need to include the variant classes to the Provider,
  // so that the overrides' varianted values can be applied when the root project's global variant is active
  const dataWithOverrides = `{ 
    base: ${wrapInTemplateString(
      `${embedInTemplateString(overridesClassName)} ${embedInTemplateString(
        "data.base"
      )}`
    )}, 
    varianted: data.varianted 
  }`;

  // Generate the import statement based on what's needed
  const reactWebImports = [
    makeCreateUseStyleTokensName(),
    ...(hasStyleTokenOverrides ? [makeCreateStyleTokensProviderName()] : []),
  ];

  const module = `${makePlasmicModulePrelude(projectId)}
  
    import { ${reactWebImports.join(", ")} } from "${getReactWebPackageName(
    exportOpts
  )}";

    ${makeProjectModuleImports(projectModuleBundle)}

    ${
      // Next.js Pages Router rejects first-party non-module CSS imports
      // outside _app.tsx (https://nextjs.org/docs/messages/css-global), so we
      // omit the global imports here. The user is expected to import the
      // host's plasmic.css once from _app.tsx / app/layout.tsx; dep CSS is
      // pulled in transitively by `@import` lines inside global plasmic.css.
      exportOpts.platform === "nextjs"
        ? ""
        : [
            makeCssImport(
              projectId,
              makeProjectCssFileName(projectId, exportOpts)
            ),
            ...cssProjectDependencies.map((dep) =>
              makeCssImport(
                dep.projectId,
                makeProjectCssFileName(dep.projectId as ProjectId, exportOpts)
              )
            ),
          ].join("\n")
    }

    const data = ${projectStyleTokenData(
      site,
      projectId,
      cssProjectDependencies,
      exportOpts
    )};
  
    export const ${makeUseStyleTokensName()} = ${makeCreateUseStyleTokensName()}(
      data,
      ${makeUseGlobalVariantsName()},
    );
  
    ${
      hasStyleTokenOverrides
        ? `export const ${makeStyleTokensProviderName()} = ${makeCreateStyleTokensProviderName()}(
      ${dataWithOverrides},
      ${makeUseGlobalVariantsName()},
    );`
        : ""
    }`;

  return {
    id: projectId,
    module,
    fileName: makeStyleTokensProviderFileName(projectId, exportOpts),
  };
}

function makeCssImport(projectId: string, cssFileName: string) {
  // Project CSS is always non-module; emit a global import so the
  // global classes (`.plasmic_tokens_<id>`, `@keyframes`, etc.) are loaded
  // wherever this provider is imported.
  return makeTaggedPlasmicDefaultImport(
    "",
    cssFileName,
    projectId,
    "projectcss"
  );
}

/**
 * Returns the token class data that the project's components must use.
 * This includes the project's own (base / varianted) tokens
 *
 * This data is always available to the project's components via `useStyleTokens`
 * even when its not wrapped by a StyleTokensProvider.
 *
 */
function projectStyleTokenData(
  site: Site,
  projectId: ProjectId,
  cssProjectDependencies: CssProjectDependencies,
  exportOpts: SetRequired<Partial<ExportOpts>, "targetEnv">
) {
  const baseClassNames = [
    // project plasmic_tokens
    makePlasmicTokensClassName(projectId, exportOpts),
    // dependencies plasmic_tokens
    ...cssProjectDependencies.map((dep) =>
      makePlasmicTokensClassName(dep.projectId as ProjectId, exportOpts)
    ),
  ].map(serializeGlobalCssClass);

  const contextGlobalVariantCombos =
    getContextGlobalVariantsWithVariantedTokens(site).map((v) => [v]);
  const sorter = makeGlobalVariantComboSorter(site);

  const globalVariantDataEntries = sortedVariantCombos(
    contextGlobalVariantCombos,
    sorter
  )
    .map((vc) => {
      assert(
        isValidComboForToken(vc),
        "Can only build varianted combos with one variant"
      );
      const variant = vc[0];
      const variantName = toVarName(variant.name);
      const variantGroup = ensure(
        variant.parent,
        "Global variants always have parent group"
      );
      const groupName = toVarName(variantGroup.param.variable.name);
      const classNameExpr = serializeGlobalCssClass(
        makeCssClassNameForVariantCombo(vc, exportOpts)
      );
      return `{
            className: ${classNameExpr},
            groupName: ${jsLiteral(groupName)},
            variant: ${jsLiteral(variantName)},
          }`;
    })
    .join(",\n");

  const baseArg = wrapInTemplateString(
    baseClassNames.map(embedInTemplateString).join(" ")
  );

  const variantedArg = `[
    ${globalVariantDataEntries}
  ]`;

  return `{
    base: ${baseArg},
    varianted: ${variantedArg},
  }`;
}
