import {
  DataTokenType,
  getDataTokenType,
  isDataTokenEditable,
  toDataTokenStoredValue,
} from "@/wab/commons/DataToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import {
  VariantCombo,
  getAllVariantsForTpl,
  getBaseVariant,
  isComponentStyleVariant,
  splitVariantComboKey,
  validateCombo,
} from "@/wab/shared/Variants";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  arrayEqIgnoreOrder,
  ensure,
  maybe,
  uniqueName,
  withoutNils,
} from "@/wab/shared/common";
import { getComponentArenaBaseFrame } from "@/wab/shared/component-arenas";
import {
  GlobalVariantFrame,
  TransientComponentVariantFrame,
} from "@/wab/shared/component-frame";
import {
  allCodeComponentVariants,
  isFrameComponent,
  isPageComponent,
  tryGetComponentByUuid,
} from "@/wab/shared/core/components";
import { mkVar } from "@/wab/shared/core/lang";
import { siteDataTokensDirectDeps } from "@/wab/shared/core/site-data-tokens";
import {
  getDedicatedArena,
  getReferencingFrames,
} from "@/wab/shared/core/sites";
import { getApplicableSelectors } from "@/wab/shared/core/styles";
import { toFinalToken } from "@/wab/shared/core/tokens";
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
  CustomCode,
  DataToken,
  Interaction,
  ObjectPath,
  Rep,
  Site,
  TplNode,
  Variant,
  isKnownEventHandler,
} from "@/wab/shared/model/classes";
import { parseJsCode } from "@/wab/shared/parser-utils";
import {
  serializeInvalidResource,
  type InvalidResourceJson,
} from "@/wab/shared/web-exporter/schema";
import { partition, uniq } from "lodash";
import { Result, err, ok } from "neverthrow";

/**
 * Find a component by UUID. Throws if not found.
 */
export function getComponentByUuid(site: Site, uuid: string): Component {
  return ensure(
    tryGetComponentByUuid(site, uuid),
    () => `Component with UUID "${uuid}" not found.`,
  );
}

/**
 * Find a TplNode by UUID within a component's tpl tree. Throws if not found.
 */
export function getTplByUuid(component: Component, uuid: string): TplNode {
  return ensure(
    tryGetTplByUuid(component, uuid),
    () =>
      `Element with UUID "${uuid}" not found in component "${component.name}".`,
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
  interactionUuid: string,
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
        (it) => it.uuid === interactionUuid,
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
  },
): { variants: VariantCombo; invalidUuids: string[] } {
  const variantPool = getAllVariantsForTpl({
    component: opts.component,
    tpl: opts.tpl ?? null,
    site: opts.site,
    includeSuperVariants: true,
  });

  const variantMap = new Map(variantPool.map((v) => [v.uuid, v]));
  const variants: Variant[] = [];
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
  variantUuids: string[] | undefined,
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
        .join(", ")}.`,
    );
  }
  const { valid, error } = validateCombo(component, result.variants);
  if (error) {
    throw error;
  }
  return valid;
}

export interface VariantComboParts {
  variants: VariantCombo;
  selectors: string[];
  keys: string[];
}

export function splitVariantCombo(
  site: Site,
  component: Component,
  variantCombo: string | undefined,
): VariantComboParts {
  const parts = variantCombo
    ? splitVariantComboKey(variantCombo).filter(Boolean)
    : [];
  if (parts.length === 0) {
    return { variants: [], selectors: [], keys: [] };
  }
  const [selectors, maybeUuids] = partition(uniq(parts), (v) =>
    v.startsWith(":"),
  );
  const { variants, invalidUuids: maybeRegisteredKeys } = getVariantsByUuids(
    maybeUuids,
    { component, site },
  );
  const ccVariantKeys = codeComponentVariantKeys();
  const [registeredVariantKeys, unknown] = partition(
    uniq(maybeRegisteredKeys),
    (key) => ccVariantKeys.includes(key),
  );

  const errors = withoutNils([selectorError(), notFoundError()]);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
  const { error: comboError } = validateCombo(component, variants);
  if (comboError) {
    throw comboError;
  }

  const [interactionVariants, otherVariants] = partition(
    variants,
    isComponentStyleVariant,
  );
  return {
    variants: otherVariants,
    selectors: uniq([
      ...interactionVariants.flatMap((v) => v.selectors),
      ...selectors,
    ]),
    keys: registeredVariantKeys,
  };

  function codeComponentVariantKeys() {
    const root = component.tplTree;
    return !isPageComponent(component) &&
      isTplRootWithCodeComponentVariants(root)
      ? Object.keys(root.component.codeComponentMeta.variants)
      : [];
  }

  function selectorError() {
    if (selectors.length === 0) {
      return undefined;
    }
    const root = component.tplTree;
    const name = component.name;
    const list = selectors.map((s) => `"${s}"`).join(", ");
    if (isPageComponent(component)) {
      return `Selector(s) ${list} don't apply to pages; "${name}" is a page. Use variant groups instead.`;
    }
    if (isTplRootWithCodeComponentVariants(root)) {
      return `Selector(s) ${list} don't apply to "${name}"; use its RootCodeComponentVariant keys instead.`;
    }
    if (!isTplTag(root)) {
      return `Selector(s) ${list} need a tag root; "${name}" has a component instance as its root, which supports neither selectors nor registered keys.`;
    }
    return unsupportedSelectorsError(selectors, root.tag, {
      forElement: false,
      isRoot: true,
    });
  }

  function notFoundError() {
    if (unknown.length === 0) {
      return undefined;
    }
    return `Variant(s) not found: ${unknown.map((u) => `"${u}"`).join(", ")}.${
      ccVariantKeys.length > 0
        ? ` Registered keys: ${ccVariantKeys.join(", ")}.`
        : ""
    }`;
  }
}

export function unsupportedSelectorsError(
  selectors: string[],
  tag: string,
  { forElement, isRoot }: { forElement: boolean; isRoot: boolean },
): string | undefined {
  const applicable = getApplicableSelectors(tag, forElement, isRoot).map(
    (option) => option.cssSelector,
  );
  const unsupported = selectors.filter((s) => !applicable.includes(s));
  if (unsupported.length === 0) {
    return undefined;
  }
  const list = unsupported.map((s) => `"${s}"`).join(", ");
  if (forElement && isRoot) {
    const supported =
      applicable.length > 0 ? ` Supported: ${applicable.join(", ")}.` : "";
    return `Unsupported selector(s) ${list} for the root <${tag}> element.${supported} For the component's states, omit pseudoSelectors and set variantCombo instead, e.g. variantCombo: "${unsupported[0]}".`;
  }
  const target = forElement ? `a <${tag}> element` : `a <${tag}> root`;
  return `Unsupported selector(s) ${list} for ${target}. Supported: ${
    applicable.join(", ") || "none"
  }.`;
}

/** Returns the combo's variants, creating any that don't exist yet. */
export function ensureVariantCombo(
  tplMgr: TplMgr,
  component: Component,
  { variants, selectors, keys }: VariantComboParts,
): VariantCombo {
  const combo = [...variants];
  if (selectors.length > 0) {
    combo.push(tplMgr.createStyleVariant(component, selectors)[0]);
  }
  const root = component.tplTree;
  if (keys.length > 0 && isTplRootWithCodeComponentVariants(root)) {
    combo.push(
      allCodeComponentVariants(component).find((variant) =>
        arrayEqIgnoreOrder(variant.codeComponentVariantKeys, keys),
      ) ??
        tplMgr.createCodeComponentVariant(component, root.component.name, keys),
    );
  }
  return combo.length > 0 ? combo : [getBaseVariant(component)];
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
 *
 * `variantCombo` is the combo the VariantTplMgr targets, as a view of that
 * combo would. Defaults to the base variant.
 */
export function getComponentArenaAndVariantTplMgr(
  site: Site,
  component: Component,
  tplMgr: TplMgr,
  variantCombo?: VariantCombo,
): { vtm: VariantTplMgr } {
  const arenaFrame = isFrameComponent(component)
    ? getReferencingFrames(site, component)[0]
    : maybe(getDedicatedArena(site, component), getComponentArenaBaseFrame);
  if (!arenaFrame) {
    throw new Error(`Component "${component.name}" has no arena.`);
  }
  const frame = new TransientComponentVariantFrame(arenaFrame.container);
  if (variantCombo) {
    frame.setTargetVariants(variantCombo);
  }
  const vtm = new VariantTplMgr(
    [frame],
    site,
    tplMgr,
    new GlobalVariantFrame(site, arenaFrame),
  );
  return { vtm };
}

/**
 * Builds a `Rep`, normalizing item/index var names to valid, distinct JS identifiers.
 */
export function mkNormalizedRep(
  collection: CustomCode | ObjectPath,
  itemName?: string,
  indexName?: string,
): Rep {
  const element = toVarName(itemName || "currentItem");
  const index = uniqueName([element], toVarName(indexName || "currentIndex"), {
    separator: "",
    normalize: toVarName,
  });
  return new Rep({ collection, element: mkVar(element), index: mkVar(index) });
}

export function getEditableDataToken(
  site: Site,
  uuid: string,
): Result<DataToken, InvalidResourceJson> {
  const token = siteDataTokensDirectDeps(site).find((t) => t.uuid === uuid);
  if (!token) {
    return err(
      serializeInvalidResource(
        uuid,
        "DataToken",
        `Data token with UUID "${uuid}" not found.`,
      ),
    );
  }
  if (!isDataTokenEditable(toFinalToken(token, site))) {
    return err(
      serializeInvalidResource(
        uuid,
        "DataToken",
        `Data token "${token.name}" is imported or registered and cannot be edited or deleted.`,
      ),
    );
  }
  return ok(token);
}

export function toValidStoredValue(
  value: string,
  type: DataTokenType,
): Result<string, string> {
  if (type === "number" && getDataTokenType(value) !== "number") {
    return err(`"${value}" is not a number.`);
  }
  const storedValue = toDataTokenStoredValue(value, type);
  if (type === "code") {
    try {
      parseJsCode(storedValue);
    } catch (e) {
      return err(`invalid code: ${e instanceof Error ? e.message : e}.`);
    }
  }
  return ok(storedValue);
}
