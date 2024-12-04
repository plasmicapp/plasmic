import {
  extractUsedGlobalVariantsForTokens,
  extractUsedTokensForTheme,
} from "@/wab/shared/codegen/style-tokens";
import { jsString, toVarName } from "@/wab/shared/codegen/util";
import {
  extractUsedGlobalVariantsForComponents,
  makeGlobalVariantGroupUseName,
  makeUniqueUseScreenVariantsName,
} from "@/wab/shared/codegen/variants";
import { allStyleTokensDict } from "@/wab/shared/core/sites";
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
