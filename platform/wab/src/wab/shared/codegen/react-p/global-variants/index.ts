import { jsString, toVarName } from "@/wab/shared/codegen/util";
import {
  extractUsedGlobalVariantsForComponents,
  makeGlobalVariantGroupUseName,
  makeUniqueUseScreenVariantsName,
} from "@/wab/shared/codegen/variants";
import { allStyleTokens } from "@/wab/shared/core/sites";
import { DevFlagsType } from "@/wab/shared/devflags";
import {
  Component,
  ensureKnownVariantGroup,
  Site,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import {
  getReferencedVariantGroups,
  isMediaQueryVariantGroup,
  VariantCombo,
  VariantGroupType,
} from "@/wab/shared/Variants";

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

/**
 * @param site The Site containing the component and global variant groups
 * @param component The component to get the used global variant groups for
 * @param projectFlags The project flags
 * @returns The global variant groups that the component must read from to apply token CSS and JS changes
 */
export function getUsedGlobalVariantGroups(
  site: Site,
  component: Component,
  projectFlags: DevFlagsType
) {
  return getReferencedVariantGroups([
    ...extractUsedGlobalVariantsForComponents(
      site,
      [component],
      projectFlags.usePlasmicImg
    ),
    // These global variants are not necessarily used by the component, but they contribute to varianted values of style tokens, which may be used within the component's slots, so we still include them.
    ...getContextGlobalVariantsWithVariantedTokens(site),
  ]);
}

/**
 *
 * @param site The Site containing the varianted style tokens
 * @returns Variant groups that contribute to varianted values of style tokens.
 * All codegen'd React components in the given site must read from these global variants' context to apply token CSS changes (even though they may not use the tokens directly).
 */
export function getContextGlobalVariantsWithVariantedTokens(site: Site) {
  return allStyleTokens(site, { includeDeps: "all" })
    .map((t) => t.variantedValues.flatMap((v) => v.variants))
    .flat()
    .filter((v) => v.parent && !isMediaQueryVariantGroup(v.parent));
}
