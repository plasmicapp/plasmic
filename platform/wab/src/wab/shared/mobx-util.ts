import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import mobx from "@/wab/shared/import-mobx";
import type { Component } from "@/wab/shared/model/classes";
import type {
  IComputedValue,
  IComputedValueOptions,
  IEqualsComparer,
  IObservableValue,
} from "mobx";
import { computedFn } from "mobx-utils";

type Getter<T> = () => T;
type Setter<T> = (value: T) => void;

let globalObservable: IObservableValue<number> | undefined = undefined;

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

export function dependOnGlobalObservable() {
  return globalObservable?.get();
}

export function makeGlobalObservable() {
  globalObservable = mobx.observable.box(1);
}

export function mutateGlobalObservable() {
  globalObservable?.set((globalObservable.get() + 1) % 100);
}

export function clearGlobalObservable() {
  globalObservable = undefined;
}

/**
 * Workaround function while we migrate to the Operation model
 * USE WITH CAUTION.
 */
export function ensureComponentsObserved(components: Component[]) {
  if (typeof window === "undefined") {
    return true;
  }
  const studioCtx: StudioCtx | undefined = (window as any).studioCtx;

  return studioCtx?.observeComponents(components);
}

/**
 * Like `computedFn(fn, { keepAlive: true, ...opts })`, except that:
 *
 * - it only caches when running in a browser and an argument is observable;
 *   otherwise it calls `fn` directly
 * - the cached values also depend on the global observable, so they're
 *   recomputed when `maybeObserveComponents` starts observing a component's
 *   `tplTree`, which earlier reads didn't track
 *
 * Like `computedFn`, a keepAlive value is never released, so prefer
 * `ownedComputedFn` when an argument dies before the observables `fn` reads.
 */
export function maybeComputedFn<T extends (...args: any[]) => any>(
  fn: T,
  opts?: IComputedValueOptions<ReturnType<T>>,
): T {
  const maybeAddGlobalObservableFn: T = ((...args: any[]) => {
    dependOnGlobalObservable();
    return fn(...args);
  }) as T;
  const actuallyComputedFn = computedFn(maybeAddGlobalObservableFn, {
    keepAlive: true,
    ...opts,
  });
  return function (...args: any[]) {
    if (
      typeof window !== "undefined" &&
      args.some((x) => mobx.isObservable(x))
    ) {
      return actuallyComputedFn(...args);
    } else {
      return fn(...args);
    }
  } as T;
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
  },
): CachingFunction<T> {
  const cache = new Map<string, IComputedValue<ReturnType<T>>>();
  const { keyFn } = opts;
  let i = 0;
  const func: CachingFunction<T> = Object.assign(
    function (...args: Parameters<T>) {
      if (!args.some((x) => mobx.isObservable(x))) {
        return fn(...args);
      }
      const key = keyFn(...args);
      let comp = cache.get(key);
      if (!comp) {
        comp = mobx.computed(() => fn(...args), {
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
