import { makeComponentAliases } from "@/wab/shared/codegen/react-p";
import {
  makeGlobalVariantComboChecker,
  serializeGlobalVariantValues,
} from "@/wab/shared/codegen/react-p/global-variants";
import {
  getExportedComponentName,
  makeGlobalContextPropName,
  makeUseClient,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  buildConditionalDefaultStylesPropArg,
  buildConditionalDerefTokenValueArg,
  generateReferencedImports,
  generateSubstituteComponentCalls,
  getReactWebPackageName,
  joinVariantVals,
  serializedKeyValue,
} from "@/wab/shared/codegen/react-p/utils";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { paramToVarName } from "@/wab/shared/codegen/util";
import { makeGlobalVariantGroupImportTemplate } from "@/wab/shared/codegen/variants";
import { assert } from "@/wab/shared/common";
import { getRealParams } from "@/wab/shared/core/components";
import { ExprCtx, getRawCode } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import { getProjectFlags } from "@/wab/shared/devflags";
import {
  Site,
  isKnownColorPropType,
  isKnownDefaultStylesPropType,
  isKnownStyleTokenRef,
} from "@/wab/shared/model/classes";
import L from "lodash";

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
