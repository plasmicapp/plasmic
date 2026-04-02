import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { VariantCombo, getAllVariantsForTpl } from "@/wab/shared/Variants";
import { getComponentArenaBaseFrame } from "@/wab/shared/component-arenas";
import {
  GlobalVariantFrame,
  TransientComponentVariantFrame,
} from "@/wab/shared/component-frame";
import { getDedicatedArena } from "@/wab/shared/core/sites";
import { flattenTpls } from "@/wab/shared/core/tpls";
import {
  Component,
  ComponentArena,
  PageArena,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";

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

/**
 * Create a VariantTplMgr for a component by looking up its ArenaFrame
 * from the site's arena structure.
 *
 * Uses TransientComponentVariantFrame instead of RootComponentVariantFrame.
 * RootComponentVariantFrame writes variant changes (targeting, pinning)
 * back to the ArenaFrame model, which persists and affects the editor UI.
 * TransientComponentVariantFrame stores variant state in memory only,
 * so any variant operations through this VariantTplMgr won't mutate
 * the ArenaFrame's persisted state.
 */
export function getComponentArenaAndVariantTplMgr(
  site: Site,
  component: Component,
  tplMgr: TplMgr
): { vtm: VariantTplMgr; arena: ComponentArena | PageArena } {
  const arena = getDedicatedArena(site, component);
  if (!arena) {
    throw new Error(`Component "${component.name}" has no dedicated arena.`);
  }
  const arenaFrame = getComponentArenaBaseFrame(arena);
  const vtm = new VariantTplMgr(
    [new TransientComponentVariantFrame(arenaFrame.container)],
    site,
    tplMgr,
    new GlobalVariantFrame(site, arenaFrame)
  );
  return { vtm, arena };
}
