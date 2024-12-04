import { VariantGroupType, isGlobalVariant } from "@/wab/shared/Variants";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import { ComponentGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import {
  makeGlobalVariantIdFileName,
  makeUseClient,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { getReactWebPackageName } from "@/wab/shared/codegen/react-p/utils";
import {
  extractUsedGlobalVariantsForTokens,
  extractUsedTokensForComponents,
} from "@/wab/shared/codegen/style-tokens";
import { ExportOpts } from "@/wab/shared/codegen/types";
import {
  DEFAULT_CONTEXT_VALUE,
  jsLiteral,
  jsString,
  stripExtension,
  toClassName,
  toVarName,
} from "@/wab/shared/codegen/util";
import { xAddAll } from "@/wab/shared/common";
import { plasmicImgAttrStyles } from "@/wab/shared/core/style-props";
import { createExpandedRuleSetMerger } from "@/wab/shared/core/styles";
import { isTplTag, isTplVariantable } from "@/wab/shared/core/tpls";
import { makeLayoutAwareRuleSet } from "@/wab/shared/layoututils";
import {
  Component,
  Site,
  TplNode,
  Variant,
  VariantGroup,
  VariantSetting,
} from "@/wab/shared/model/classes";
import L from "lodash";

export interface GlobalVariantConfig {
  // uuid of VariantGroup
  id: string;

  name: string;

  // Content of the GlobalVariantContext file
  contextModule: string;

  // Name of the context file
  contextFileName: string;

  // VariantGroup.type of the exported VariantGroup
  type: VariantGroupType;
}

export function exportGlobalVariantGroup(
  vg: VariantGroup,
  opts: Partial<ExportOpts>
): GlobalVariantConfig {
  return {
    id: vg.uuid,
    name: toClassName(vg.param.variable.name),
    contextModule: serializeGlobalVariantGroup(vg, opts),
    contextFileName: opts.idFileNames
      ? `${makeGlobalVariantIdFileName(vg)}.tsx`
      : makeGlobalVariantGroupFileName(vg),
    type: vg.type as VariantGroupType,
  };
}

function serializeGlobalVariantGroup(
  vg: VariantGroup,
  opts: Partial<ExportOpts>
) {
  const valueType = makeGlobalVariantGroupValueTypeName(vg);
  const contextName = makeGlobalVariantGroupContextName(vg);

  let serializedHook = `
export function ${makeGlobalVariantGroupUseName(vg)}() {
  return React.useContext(${contextName});
}
  `;

  if (vg.type === "global-screen") {
    const variants = vg.variants.filter(
      (v) => v.mediaQuery && v.mediaQuery.trim().length > 0
    );

    serializedHook = `
export const useScreenVariants = createUseScreenVariants(${jsLiteral(
      vg.multi
    )},{
  ${variants
    .map((v) => `"${toVarName(v.name)}": "${v.mediaQuery}"`)
    .join(",\n")}
});
    `;
  } else {
    if (opts.useGlobalVariantsSubstitutionApi) {
      // We don't swap screen variants in the loader, so we only use the
      // substitution API for the other global variant groups
      serializedHook = `
import { globalVariantHooks } from "@plasmicapp/loader-runtime-registry";

export function ${makeGlobalVariantGroupUseName(vg)}() {
  const maybeHook = globalVariantHooks["${vg.uuid}"];
  return maybeHook ? maybeHook() : React.useContext(${contextName});
}
      `;
    }
  }

  return `
    // @ts-nocheck
    /* eslint-disable */
    /* tslint:disable */
    /* prettier-ignore-start */

    ${makeUseClient(opts)}

    import * as React from "react";
    import { createUseScreenVariants } from "${getReactWebPackageName(opts)}";

    export type ${valueType} = ${serializeVariantGroupMembersType(vg)};
    export const ${contextName} = React.createContext<${
    vg.multi ? `${valueType}[]` : valueType
  } | undefined>("${DEFAULT_CONTEXT_VALUE}" as any);
    ${serializedHook}
    export default ${contextName};
    /* prettier-ignore-end */
  `;
}

export function makeGlobalVariantGroupValueTypeName(vg: VariantGroup) {
  return `${toClassName(vg.param.variable.name)}Value`;
}

export function makeGlobalVariantGroupContextName(vg: VariantGroup) {
  return `${toClassName(vg.param.variable.name)}Context`;
}

export function makeGlobalVariantGroupUseName(vg: VariantGroup) {
  return `use${toClassName(vg.param.variable.name)}`;
}

export function makeGlobalVariantGroupFileName(vg: VariantGroup) {
  return `PlasmicGlobalVariant__${toClassName(vg.param.variable.name)}.tsx`;
}

export function makeUniqueUseScreenVariantsName(vg: VariantGroup) {
  return `useScreenVariants${toVarName(vg.uuid)}`;
}

export function makeGlobalVariantGroupImportTemplate(
  vg: VariantGroup,
  relDir: string,
  opts: { idFileNames?: boolean }
) {
  const fileName = opts.idFileNames
    ? makeGlobalVariantIdFileName(vg)
    : stripExtension(makeGlobalVariantGroupFileName(vg));
  const imports =
    vg.type === "global-screen"
      ? [`useScreenVariants as ${makeUniqueUseScreenVariantsName(vg)}`]
      : [
          makeGlobalVariantGroupValueTypeName(vg),
          makeGlobalVariantGroupUseName(vg),
        ];
  const importPath = `${relDir}/${fileName}`;

  return `import {${imports.join(
    ", "
  )}} from "${importPath}";  // plasmic-import: ${vg.uuid}/globalVariant`;
}

export function serializeVariantGroupMembersType(vg: VariantGroup) {
  return vg.variants.map((v) => jsString(toVarName(v.name))).join(" | ");
}

export function extractUsedGlobalVariantsForComponents(
  site: Site,
  components: Component[],
  usePlasmicImg: boolean,
  ctx?: ComponentGenHelper
) {
  const usedGlobalVariants = new Set<Variant>();
  for (const component of components) {
    xAddAll(
      usedGlobalVariants,
      extractUsedGlobalVariantsForNodes(
        ctx?.flattenComponent(component) ?? flattenComponent(component),
        usePlasmicImg,
        ctx
      )
    );
  }

  xAddAll(
    usedGlobalVariants,
    extractUsedGlobalVariantsForTokens(
      extractUsedTokensForComponents(site, components, {
        expandMixins: true,
        // We need to deref tokens also so that if this component uses a token
        // that references another token, and _that_ token varies by global
        // variant, then this component also needs to know when that global
        // variant changes, to apply the right styles on the root element.
        derefTokens: true,
      })
    )
  );
  return usedGlobalVariants;
}

export function extractUsedGlobalVariantsForNodes(
  nodes: TplNode[],
  usePlasmicImg: boolean,
  ctx?: ComponentGenHelper
) {
  const usedGlobalVariants = new Set<Variant>();
  for (const node of nodes) {
    if (isTplVariantable(node)) {
      for (const vs of node.vsettings) {
        for (const v of getUsedGlobalVariantsForNonCss(
          vs,
          node,
          usePlasmicImg
        )) {
          usedGlobalVariants.add(v);
        }
      }
    }
  }
  return usedGlobalVariants;
}

export function getUsedGlobalVariantsForNonCss(
  vs: VariantSetting,
  tpl: TplNode,
  usePlasmicImg: boolean,
  ctx?: ComponentGenHelper
) {
  return vs.variants.filter((v) => {
    if (isGlobalVariant(v)) {
      const vg = v.parent;
      if (vg && vg.type === "global-screen") {
        const exp =
          ctx?.getExpr(tpl, vs) ??
          createExpandedRuleSetMerger(
            makeLayoutAwareRuleSet(vs.rs, false),
            tpl
          );
        // For GlobalScreen variants, we only add it as used if it contains
        // non-css changes
        if (
          !!vs.text ||
          !!vs.dataCond ||
          !L.isEmpty(vs.attrs) ||
          !L.isEmpty(vs.args) ||
          exp.has("flex-column-gap") ||
          exp.has("flex-row-gap")
        ) {
          return true;
        }
        if (
          usePlasmicImg &&
          isTplTag(tpl) &&
          tpl.tag === "img" &&
          plasmicImgAttrStyles.some((p) => exp.has(p))
        ) {
          return true;
        }
      } else {
        // For all other Global variants, we always add as used, as they need
        // to be explicitly toggled on and off, and we only know what is
        // on and off by reading from the context.
        return true;
      }
    }
    return false;
  });
}

export function serializeVariantArgsGroupType(vg: VariantGroup) {
  const membersType = serializeVariantGroupMembersType(vg);
  if (vg.variants.length === 0) {
    return "never";
  } else if (vg.multi) {
    return `MultiChoiceArg<${membersType}>`;
  } else if (
    vg.variants.length === 1 &&
    toVarName(vg.param.variable.name) === toVarName(vg.variants[0].name)
  ) {
    return `SingleBooleanChoiceArg<${membersType}>`;
  } else {
    return `SingleChoiceArg<${membersType}>`;
  }
}

export function serializeVariantsArgsTypeContent(vgs: VariantGroup[]) {
  if (vgs.length === 0) {
    return "{}";
  }

  return `{
    ${vgs
      .map(
        (vg) =>
          `${toVarName(
            vg.param.variable.name
          )}?: ${serializeVariantArgsGroupType(vg)}`
      )
      .join("\n")}
  }`;
}
