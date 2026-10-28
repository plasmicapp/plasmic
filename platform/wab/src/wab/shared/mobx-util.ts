import mobx from "@/wab/shared/import-mobx";
import type { Component, Site } from "@/wab/shared/model/classes";
import { isModelInst } from "@/wab/shared/model/model-meta";
import {
  isInstTracked,
  markCurrentDerivationCoarse,
} from "@/wab/shared/model/tracking";
import type {
  IComputedValue,
  IComputedValueOptions,
  IEqualsComparer,
} from "mobx";
import { computedFn } from "mobx-utils";

type Getter<T> = () => T;
type Setter<T> = (value: T) => void;

/** Shorthand for defining a getter function. */
export function getter<T>(observable: { get: Getter<T> }): Getter<T> {
  // Can't return observable.get because it's a method on the prototype.
  // Use arrow function to capture the observable instance.
  return () => observable.get();
}

/** Shorthand for defining a setter function. */
export function setter<T>(observable: { set: Setter<T> }): Setter<T> {
  // Can't return observable.set because it's a method on the prototype.
  // Use arrow function to capture the observable instance.
  return (value: T) => observable.set(value);
}

/** Custom equals comparer that uses an object's `equals` method. */
export const equalsComparer: IEqualsComparer<{
  equals: (other: any) => boolean;
}> = (a, b) => a.equals(b);

/**
 * Whether results for these args may be cached with keepAlive: only if an arg
 * is a tracked inst or another mobx observable, which invalidates the cache.
 * Otherwise, e.g. on the server, the cache would go stale and leak.
 */
function shouldCache(args: any[]) {
  return (
    typeof window !== "undefined" &&
    args.some((x) => (isModelInst(x) ? isInstTracked(x) : mobx.isObservable(x)))
  );
}

/**
 * A keepAlive `computedFn` that tracks each model field it reads.
 *
 * Each field read keeps an atom alive as long as the result is cached, i.e.
 * forever, so only use this for functions that read few insts, such as a
 * Site's lists. Use `coarseSelector` for functions that traverse the model.
 *
 * Like `computedFn`, a keepAlive value is never released, so prefer
 * `ownedComputedFn` when an argument dies before the observables `fn` reads.
 */
export function maybeComputedFn<T extends (...args: any[]) => any>(
  fn: T,
  opts?: IComputedValueOptions<ReturnType<T>>,
): T {
  const actuallyComputedFn = computedFn(fn, {
    keepAlive: true,
    ...opts,
  });
  return function (...args: any[]) {
    return shouldCache(args) ? actuallyComputedFn(...args) : fn(...args);
  } as T;
}

/**
 * Wraps `fn` so that the mobx derivation that calls it tracks the model
 * coarsely; see `coarseSelector`. Pass the result straight to `computedFn` or
 * `mobx.computed`, so that the derivation it marks is that computed.
 */
export function trackCoarsely<T extends (...args: any[]) => any>(fn: T): T {
  return function (...args: any[]) {
    // An untracked arg may be a new inst still being built, which has no
    // scope, so observe its fields
    markCurrentDerivationCoarse(
      args.some((x) => isModelInst(x) && !isInstTracked(x)),
    );
    return fn(...args);
  } as T;
}

/**
 * A keepAlive `computedFn` for functions that traverse the model.
 *
 * Rather than one atom per field read, the result depends on the scopes of
 * the insts it reads (see `isSelectorScopeRoot` in observable-model.ts), so
 * it is recomputed after any change to a scope it read from.
 *
 * Selectors it calls track in their own way, and are dependencies as usual.
 * So a site-wide selector should call a per-Component selector for each
 * Component, rather than traverse them all itself.
 *
 * Untracked insts, such as the sites of dependencies, are treated as
 * immutable, unless an arg is untracked (e.g. a new inst still being built):
 * then their fields are tracked one by one.
 */
export function coarseSelector<T extends (...args: any[]) => any>(
  fn: T,
  opts?: IComputedValueOptions<ReturnType<T>>,
): T {
  const actuallyComputedFn = computedFn(trackCoarsely(fn), {
    keepAlive: true,
    ...opts,
  });
  return function (...args: any[]) {
    return shouldCache(args) ? actuallyComputedFn(...args) : fn(...args);
  } as T;
}

/** A `coarseSelector` of a Component (and possibly more args) */
export function componentSelector<
  T extends (component: Component, ...args: any[]) => any,
>(fn: T, opts?: IComputedValueOptions<ReturnType<T>>): T {
  return coarseSelector(fn, opts);
}

/** A `coarseSelector` of a Site (and possibly more args) */
export function siteSelector<T extends (site: Site, ...args: any[]) => any>(
  fn: T,
  opts?: IComputedValueOptions<ReturnType<T>>,
): T {
  return coarseSelector(fn, opts);
}

/** A `mobx.computed` that tracks the model coarsely; see `coarseSelector` */
export function coarseComputed<T>(
  fn: () => T,
  opts?: IComputedValueOptions<T>,
): IComputedValue<T> {
  return mobx.computed(trackCoarsely(fn), opts);
}

type CachingFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  clear: () => void;
};
const keyedFns: CachingFunction<any>[] = [];
export function keyedComputedFn<T extends (...args: any[]) => any>(
  fn: T,
  opts: {
    keyFn: (...args: Parameters<T>) => string;
    name?: string;
    /** Track the model coarsely; see `coarseSelector` */
    coarse?: boolean;
  },
): CachingFunction<T> {
  const cache = new Map<string, IComputedValue<ReturnType<T>>>();
  const { keyFn } = opts;
  const trackedFn = opts.coarse ? trackCoarsely(fn) : fn;
  let i = 0;
  const func: CachingFunction<T> = Object.assign(
    function (...args: Parameters<T>) {
      if (!shouldCache(args)) {
        return fn(...args);
      }
      const key = keyFn(...args);
      let comp = cache.get(key);
      if (!comp) {
        comp = mobx.computed(() => trackedFn(...args), {
          name: `${opts.name ?? fn.name}-${i++}`,
          keepAlive: true,
        });
        cache.set(key, comp);
      }
      return comp.get();
    },
    {
      clear: () => {
        cache.clear();
      },
    },
  );
  keyedFns.push(func);
  return func;
}

export function clearKeyedComputedFns() {
  keyedFns.forEach((fn) => fn.clear());
}

/**
 * When an IComputedValue was created with keepAlive, then it does
 * not ever get "suspended", which means it will continue to reference
 * its dependencies, and its dependencies will continue to reference it,
 * resulting in a cycle.
 *
 * This uses undocumented API to "unobserve" keepAlive IComputedValues.
 */
export function unobserveComputed(comp: IComputedValue<any>) {
  (comp as any).keepAlive_ = false;
  (comp as any).suspend_();
}

const ownerToDisposers = new WeakMap<object, (() => void)[]>();
const ownedComputedLeaf = Symbol("ownedComputedLeaf");

/**
 * Like `computedFn(fn, { keepAlive: true })`, except that the values cached
 * for an `owner` (the first argument) are released by
 * `disposeOwnedComputedFns(owner)`.
 *
 * With `computedFn`, a keepAlive value is never released: it stays subscribed
 * to the observables it read, so they keep it, and everything its arguments
 * reference, alive. Use this instead when the owner dies before those
 * observables, like a canvas frame's ViewCtx or SubDeps does before the site.
 */
export function ownedComputedFn<
  Owner extends object,
  Args extends unknown[],
  Result,
>(
  fn: (owner: Owner, ...args: Args) => Result,
  opts?: { name?: string },
): (owner: Owner, ...args: Args) => Result {
  // For each owner, a tree of maps keyed by the remaining args, with the
  // computed at `ownedComputedLeaf`
  const ownerToCache = new WeakMap<
    Owner,
    { tree: Map<unknown, any>; computeds: IComputedValue<Result>[] }
  >();
  return (owner: Owner, ...args: Args): Result => {
    let cache = ownerToCache.get(owner);
    if (!cache) {
      const newCache = { tree: new Map<unknown, any>(), computeds: [] };
      ownerToCache.set(owner, newCache);
      const disposers = ownerToDisposers.get(owner) ?? [];
      disposers.push(() => {
        ownerToCache.delete(owner);
        newCache.computeds.forEach(unobserveComputed);
      });
      ownerToDisposers.set(owner, disposers);
      cache = newCache;
    }

    let node = cache.tree;
    for (const arg of args) {
      let next = node.get(arg);
      if (!next) {
        next = new Map<unknown, any>();
        node.set(arg, next);
      }
      node = next;
    }

    let comp: IComputedValue<Result> | undefined = node.get(ownedComputedLeaf);
    if (!comp) {
      comp = mobx.computed(() => fn(owner, ...args), {
        name: opts?.name ?? fn.name,
        keepAlive: true,
      });
      node.set(ownedComputedLeaf, comp);
      cache.computeds.push(comp);
    }
    return comp.get();
  };
}

/** Releases the values cached for `owner` by every `ownedComputedFn`. */
export function disposeOwnedComputedFns(owner: object) {
  const disposers = ownerToDisposers.get(owner);
  ownerToDisposers.delete(owner);
  // In a batch, so that observables are notified at its end that they became
  // unobserved
  mobx.runInAction(() => disposers?.forEach((dispose) => dispose()));
}
