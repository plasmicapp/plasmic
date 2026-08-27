import {
  VariantCombo,
  VariantGroupType,
  getReferencedVariantGroups,
  isMediaQueryVariantGroup,
} from "@/wab/shared/Variants";
import { SiteGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import {
  makeCreateUseGlobalVariantsName,
  makeUseGlobalVariantsName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { ProjectModuleBundle } from "@/wab/shared/codegen/types";
import { jsString, toVarName } from "@/wab/shared/codegen/util";
import {
  extractUsedGlobalVariantsForComponents,
  makeGlobalVariantGroupUseName,
  makeUniqueUseScreenVariantsName,
} from "@/wab/shared/codegen/variants";
import { FinalToken } from "@/wab/shared/core/tokens";
import { DevFlagsType } from "@/wab/shared/devflags";
import {
  Component,
  Site,
  StyleToken,
  Variant,
  VariantGroup,
  ensureKnownVariantGroup,
} from "@/wab/shared/model/classes";
import { uniqBy } from "lodash";

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

export function serializeGlobalVariantValues(
  groups: Set<VariantGroup>,
  projectModuleBundle: ProjectModuleBundle | undefined
) {
  if (groups.size === 0) {
    return "";
  }

  if (projectModuleBundle) {
    // If there's a project module, we can depend on useGlobalVariants
    return `const globalVariants = ${makeUseGlobalVariantsName()}();`;
  } else {
    // Otherwise fallback to old ensureGlobalVariants
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
}

export function serializeUseGlobalVariants(groups: Set<VariantGroup>) {
  const template = [...groups]
    .map((group) => {
      const name = toVarName(group.param.variable.name);
      if (group.type === VariantGroupType.GlobalScreen) {
        return `${name}: ${makeUniqueUseScreenVariantsName(group)}`;
      }
      return `${name}: ${makeGlobalVariantGroupUseName(group)}`;
    })
    .join(",\n");

  return `
  export const ${makeUseGlobalVariantsName()} = ${makeCreateUseGlobalVariantsName()}({
    ${template}
  });
`;
}

/**
 * @param siteGenHelper Helper for the Site containing the component and global variant groups. Shared across components of a codegen request so the site's tokens are only computed once.
 * @param component The component to get the used global variant groups for
 * @param projectFlags The project flags
 * @returns The global variant groups that the component must read from to apply token CSS and JS changes
 */
export function getUsedGlobalVariantGroups(
  siteGenHelper: SiteGenHelper,
  component: Component,
  projectFlags: DevFlagsType
) {
  return getReferencedVariantGroups([
    ...extractUsedGlobalVariantsForComponents(
      siteGenHelper.site,
      [component],
      projectFlags.usePlasmicImg,
      siteGenHelper.allStyleTokensAndOverridesDict()
    ),
    // These global variants are not necessarily used by the component, but they contribute to varianted values of style tokens, which may be used within the component's slots, so we still include them.
    ...siteGenHelper.contextGlobalVariantsWithVariantedTokens(),
  ]);
}

/**
 *
 * @param allTokens All final style tokens of the site and its dependencies, e.g. `siteFinalStyleTokensAllDeps(site)` or `SiteGenHelper.allStyleTokensAndOverrides()`
 * @returns Variant groups that contribute to varianted values of style tokens.
 * All codegen'd React components in the given site must read from these global variants' context to apply token CSS changes (even though they may not use the tokens directly).
 */
export function getContextGlobalVariantsWithVariantedTokens(
  allTokens: ReadonlyArray<FinalToken<StyleToken>>
) {
  return uniqBy(
    allTokens
      .map((t) => t.variantedValues.flatMap((v) => v.variants))
      .flat()
      .filter((v) => v.parent && !isMediaQueryVariantGroup(v.parent)),
    (v) => v.uuid
  );
}
