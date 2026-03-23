import { VariantCombo, getAllVariantsForTpl } from "@/wab/shared/Variants";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { Component, Site, TplNode } from "@/wab/shared/model/classes";

/**
 * Find a component by UUID. Throws if not found.
 */
export function getComponentByUuid(site: Site, uuid: string): Component {
  const component = site.components.find((c) => c.uuid === uuid);
  if (!component) {
    throw new Error(`Component with UUID "${uuid}" not found.`);
  }
  return component;
}

/**
 * Find a TplNode by UUID within a component's tpl tree. Throws if not found.
 */
export function getTplByUuid(component: Component, uuid: string): TplNode {
  const tpl = flattenTpls(component.tplTree).find((t) => t.uuid === uuid);
  if (!tpl) {
    throw new Error(
      `Element with UUID "${uuid}" not found in component "${component.name}".`
    );
  }
  return tpl;
}

/**
 * Find variants by their UUIDs within a component's available variants.
 * Throws if any UUIDs are not found.
 */
export function getVariantsByUuids(
  variantUuids: string[],
  opts: {
    component: Component;
    tpl?: TplNode | null;
    site: Site;
  }
): VariantCombo {
  const allVariants = getAllVariantsForTpl({
    component: opts.component,
    tpl: opts.tpl ?? null,
    site: opts.site,
    includeSuperVariants: true,
  });
  const variantMap = new Map(allVariants.map((v) => [v.uuid, v]));
  const variants: VariantCombo = [];
  const invalidUuids: string[] = [];

  for (const uuid of variantUuids) {
    const variant = variantMap.get(uuid);
    if (variant) {
      variants.push(variant);
    } else {
      invalidUuids.push(uuid);
    }
  }

  if (invalidUuids.length) {
    throw new Error(
      `Variant(s) not found: ${invalidUuids.map((u) => `"${u}"`).join(", ")}.`
    );
  }

  return variants;
}
