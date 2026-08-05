import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  VariantCombo,
  getAllVariantsForTpl,
  getBaseVariant,
} from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { ensure, uniqueName } from "@/wab/shared/common";
import { getComponentArenaBaseFrame } from "@/wab/shared/component-arenas";
import {
  GlobalVariantFrame,
  TransientComponentVariantFrame,
} from "@/wab/shared/component-frame";
import { tryGetComponentByUuid } from "@/wab/shared/core/components";
import { mkVar } from "@/wab/shared/core/lang";
import { getDedicatedArena } from "@/wab/shared/core/sites";
import {
  EventHandlerKeyType,
  flattenTpls,
  getAllEventHandlersOfAttrType,
  getAllEventHandlersOfParamType,
  isTplComponent,
  isTplTag,
  tryGetTplByUuid,
} from "@/wab/shared/core/tpls";
import {
  Component,
  ComponentArena,
  CustomCode,
  Interaction,
  ObjectPath,
  PageArena,
  Rep,
  Site,
  TplNode,
  isKnownEventHandler,
} from "@/wab/shared/model/classes";

/**
 * Find a component by UUID. Throws if not found.
 */
export function getComponentByUuid(site: Site, uuid: string): Component {
  return ensure(
    tryGetComponentByUuid(site, uuid),
    () => `Component with UUID "${uuid}" not found.`
  );
}

/**
 * Find a TplNode by UUID within a component's tpl tree. Throws if not found.
 */
export function getTplByUuid(component: Component, uuid: string): TplNode {
  return ensure(
    tryGetTplByUuid(component, uuid),
    () =>
      `Element with UUID "${uuid}" not found in component "${component.name}".`
  );
}

/**
 * Find an interaction step by its uuid within a component's tpl tree,
 * along with the element and event-handler slot it lives in. Only
 * base-variant tag attrs and function-typed instance args are searched
 * (the slots the interaction operations manage).
 */
export function findInteractionInComponent(
  component: Component,
  interactionUuid: string
):
  | {
      tpl: TplNode;
      eventName: string;
      eventHandlerKey: EventHandlerKeyType;
      interaction: Interaction;
    }
  | undefined {
  for (const tpl of flattenTpls(component.tplTree)) {
    if (!isTplTag(tpl) && !isTplComponent(tpl)) {
      continue;
    }
    const eventHandlersData = [
      ...getAllEventHandlersOfAttrType(component, tpl),
      ...getAllEventHandlersOfParamType(component, tpl),
    ];
    for (const eventHandler of eventHandlersData) {
      if (!isKnownEventHandler(eventHandler.expr)) {
        continue;
      }
      const interaction = eventHandler.expr.interactions.find(
        (it) => it.uuid === interactionUuid
      );
      if (interaction) {
        return {
          tpl,
          eventName: eventHandler.eventName,
          eventHandlerKey: eventHandler.eventHandlerKey,
          interaction,
        };
      }
    }
  }
  return undefined;
}

/**
 * Find variants by their UUIDs.
 *
 * Pass component (and optionally tpl) to scope the lookup to that
 * component's own variants plus all in-scope globals.
 *
 * Omit component to scope to global variants only
 * useful for resources like style tokens whose VariantedValue are Global variant only.
 *
 * Returns the resolved variants and any uuids that didn't
 * match.
 */
export function getVariantsByUuids(
  variantUuids: string[],
  opts: {
    site: Site;
    component?: Component;
    tpl?: TplNode | null;
  }
): { variants: VariantCombo; invalidUuids: string[] } {
  const variantPool = getAllVariantsForTpl({
    component: opts.component,
    tpl: opts.tpl ?? null,
    site: opts.site,
    includeSuperVariants: true,
  });

  const variantMap = new Map(variantPool.map((v) => [v.uuid, v]));
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
  return { variants, invalidUuids };
}

export function getComponentVariantCombo(
  site: Site,
  component: Component,
  variantUuids: string[] | undefined
): VariantCombo {
  if (!variantUuids?.length) {
    return [getBaseVariant(component)];
  }

  const result = getVariantsByUuids(variantUuids, {
    component,
    site,
  });
  if (result.invalidUuids.length) {
    throw new Error(
      `Variant(s) not found: ${result.invalidUuids
        .map((u) => `"${u}"`)
        .join(", ")}.`
    );
  }
  return result.variants;
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

/**
 * Builds a `Rep`, normalizing item/index var names to valid, distinct JS identifiers.
 */
export function mkNormalizedRep(
  collection: CustomCode | ObjectPath,
  itemName?: string,
  indexName?: string
): Rep {
  const element = toVarName(itemName || "currentItem");
  const index = uniqueName([element], toVarName(indexName || "currentIndex"), {
    separator: "",
    normalize: toVarName,
  });
  return new Rep({ collection, element: mkVar(element), index: mkVar(index) });
}
