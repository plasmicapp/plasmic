import { RenderingCtx } from "@/wab/client/components/canvas/canvas-rendering";
import { DeepMap } from "@/wab/commons/deep-map";
import { ReactHookSpec } from "@/wab/shared/codegen/react-p/react-hook-spec";
import {
  arrayEq,
  assert,
  Full,
  isLiteralObjectByName,
  objsEq,
  removeWhere,
} from "@/wab/shared/common";
import { CanvasEnv } from "@/wab/shared/eval";
import { TplNode } from "@/wab/shared/model/classes";
import { isEqual, uniq } from "lodash";
import {
  _isComputingDerivation,
  computed,
  IComputedValue,
  IComputedValueOptions,
  onBecomeUnobserved,
} from "mobx";

export type IComputedFnOptions<F extends (...args: any[]) => any> = {
  onCleanup?: (
    result: ReturnType<F> | undefined,
    ...args: Parameters<F>
  ) => void;
} & IComputedValueOptions<ReturnType<F>>;

export function reactHookSpecsToKey(reactHookSpecs: ReactHookSpec[]) {
  return JSON.stringify(
    uniq(reactHookSpecs.map((spec) => spec.hookName)).sort()
  );
}

function computeHashFromStableFields(node: TplNode, ctx: RenderingCtx) {
  return [
    ctx.sub,
    // ctx.viewCtx, // `viewCtx` can't change if ctx.sub hasn't changed
    // ctx.site, // `site` can't change if ctx.sub hasn't changed
    node,
    ctx.valKey,
    // ctx.ownersStack, // `ownersStack` can't change if `valKey` hasn't changed
    // ctx.ownerKey, // `ownerKey` can't change if `valKey` hasn't changed
    ctx.rootClassName,
    ctx.ownerComponent,
    ctx.nodeNamer,
    ctx.projectFlags,
    ctx.setDollarQueries,
    JSON.stringify([...ctx.activeVariants.keys()].map((v) => v.uuid).sort()),
    JSON.stringify(
      [
        ...(ctx.forceValComponentKeysWithDefaultSlotContents?.keys() ?? []),
      ].sort()
    ),
    ctx.inline,
    ctx.slate,
    reactHookSpecsToKey(ctx.reactHookSpecs),
    // ctx.triggers, // `triggers` keys can't change if `reactHookSpecs` hasn't changed
    JSON.stringify(ctx.triggerProps),
    JSON.stringify(ctx.$ccVariants),
    ctx.updateVariant,
    JSON.stringify(ctx.visibilityOptions),
  ];
}

// We use this type to force a type error whenever a new field is added
// to RenderingCtx to make sure the hash will be updated properly
type HandledCtxFields =
  | "valKey"
  | "sub"
  | "viewCtx"
  | "site"
  | "rootClassName"
  | "nodeNamer"
  | "ownerComponent"
  | "ownerKey"
  | "ownersStack"
  | "activeVariants"
  | "forceValComponentKeysWithDefaultSlotContents"
  | "inline"
  | "slate"
  | "projectFlags"
  | "setDollarQueries"
  | "reactHookSpecs"
  | "triggers"
  | "triggerProps"
  | "$ccVariants"
  | "updateVariant"
  | "visibilityOptions";

type NonStableFieldsFromCtx = Omit<Full<RenderingCtx>, HandledCtxFields> & {
  $stateSnapshot: Record<string, any>;
};

function computeNonStableFields(ctx: RenderingCtx): NonStableFieldsFromCtx {
  return {
    env: {
      ...ctx.env,
      $queries: Object.fromEntries(Object.entries(ctx.env.$queries)),
    },
    wrappingEnv: ctx.wrappingEnv,
    overrides: ctx.overrides,
    $stateSnapshot: ctx.$stateSnapshot,
    plasmicInvalidate: ctx.plasmicInvalidate,
    stateSpecs: ctx.stateSpecs,
  };
}

function compareVals(a: any, b: any) {
  if (a === b) {
    // Fast path for identity
    return true;
  }
  if (isLiteralObjectByName(a) && isLiteralObjectByName(b)) {
    return objsEq(a, b);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return arrayEq(a, b);
  }
  return a === b;
}

// eslint-disable-next-line @typescript-eslint/ban-types
function oneLevelDeepComparison(a: Object, b: Object, excludeKeys?: string[]) {
  // Minimizing object allocations during this comparison
  const aKeys = Object.keys(a);
  function countKeys(keys: string[]) {
    if (!excludeKeys) {
      return keys.length;
    }
    let count = 0;
    for (const key of keys) {
      if (!excludeKeys.includes(key)) {
        count += 1;
      }
    }
    return count;
  }

  if (countKeys(aKeys) !== countKeys(Object.keys(b))) {
    return false;
  }
  for (const key of aKeys) {
    if (excludeKeys && excludeKeys.includes(key)) {
      continue;
    }
    if (!(key in b)) {
      return false;
    }
    if (!compareVals(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Since all elements from the same component will have the
 * same $state snapshot, we remember results of prior
 * comparisons here
 */
function cachedEquiv<F extends (x: any, y: any) => boolean>(isEquiv: F) {
  const seenComparisons: WeakMap<any, WeakMap<any, boolean>> = new WeakMap();
  return ((a: any, b: any) => {
    let aComps = seenComparisons.get(a);
    if (!aComps) {
      aComps = new WeakMap();
      seenComparisons.set(a, aComps);
    }
    let bResult = aComps.get(b);
    if (bResult != null) {
      // Cache hit!
      return bResult;
    } else {
      bResult = isEquiv(a, b);
      aComps.set(b, bResult);
      return bResult;
    }
  }) as F;
}

const areStateSnapshotsEquiv = cachedEquiv(
  (a: Record<string, any>, b: Record<string, any>) => {
    return isEqual(a, b);
  }
);

const cachedOneLevelDeepComparison = cachedEquiv(oneLevelDeepComparison);

const areCanvasEnvLocalsEquiv = cachedEquiv((a: CanvasEnv, b: CanvasEnv) => {
  return oneLevelDeepComparison(a, b, ["$props", "$ctx", "$state", "$queries"]);
});

const areCanvasEnvsEquiv = cachedEquiv((a: CanvasEnv, b: CanvasEnv) => {
  if (!cachedOneLevelDeepComparison(a.$ctx, b.$ctx)) {
    return false;
  }
  if (!cachedOneLevelDeepComparison(a.$props, b.$props)) {
    return false;
  }

  if (!cachedOneLevelDeepComparison(a.$queries, b.$queries)) {
    return false;
  }
  if (!areCanvasEnvLocalsEquiv(a, b)) {
    return false;
  }
  return true;
});

const areOverridesEquiv = cachedEquiv(
  (a: Record<string, any>, b: Record<string, any>) => {
    // TODO: Probably need one more level of comparison for overrides
    return oneLevelDeepComparison(a, b);
  }
);

function areNonStableFieldsEquiv(
  a: NonStableFieldsFromCtx,
  b: NonStableFieldsFromCtx
) {
  if (!areCanvasEnvsEquiv(a.env, b.env)) {
    return false;
  }
  if (!areStateSnapshotsEquiv(a.$stateSnapshot, b.$stateSnapshot)) {
    return false;
  }
  if (!areOverridesEquiv(a.overrides, b.overrides)) {
    return false;
  }
  return true;
}

let i = 0;
const d = new DeepMap<[NonStableFieldsFromCtx, IComputedValue<any>][]>();

/**
 * A fork of `computedFn` to help caching the rendered nodes based on the ctx
 * (which might not be serializable and isn't stable).
 */
export function cachedRenderTplNode<R>(
  node: TplNode,
  ctx: RenderingCtx,
  doRenderNode: () => R
): R {
  // Stable part:
  const hash = computeHashFromStableFields(node, ctx);
  const rest = computeNonStableFields(ctx);

  const deleteEntry = () => {
    const mapEntry = d.entry(hash);
    const entries = mapEntry.get();
    removeWhere(entries, ([key]) => key === rest);
    if (entries.length === 0) {
      mapEntry.delete();
    }
  };

  const mapEntry = d.entry(hash);
  // Cache hit for the stable part
  if (mapEntry.exists()) {
    const entries = mapEntry.get();
    // For the non-stable fields, we need to do a linear search :/
    const finalEntry = entries.find(([key]) =>
      areNonStableFieldsEquiv(rest, key)
    );
    if (finalEntry) {
      // Complete cache hit!
      return finalEntry[1].get();
    } else {
      const c = computed(doRenderNode, {
        name: `cachedRenderTplNode#${++i})`,
      });
      // TODO: Maybe don't push if the array is already big enough
      entries.push([rest, c]);
      onBecomeUnobserved(c, deleteEntry);
      return c.get();
    }
  }
  // if function is invoked, and its a cache miss without reactive, there is no point in caching...
  assert(
    _isComputingDerivation(),
    () => `Rendering a canvas node without observing!`
  );
  // create new entry
  const c = computed(doRenderNode, {
    name: `cachedRenderTplNode#${++i})`,
  });
  mapEntry.set([[rest, c]]);
  // clean up if no longer observed
  onBecomeUnobserved(c, deleteEntry);
  // return current val
  return c.get();
}
