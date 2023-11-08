import type { IComputedValue, IComputedValueOptions } from "mobx";
import { computedFn } from "mobx-utils";
import mobx from "./import-mobx";

export function maybeComputedFn<T extends (...args: any[]) => any>(
  fn: T,
  opts?: IComputedValueOptions<ReturnType<T>>
): T {
  const actuallyComputedFn = computedFn(fn, { keepAlive: true, ...opts });
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
  }
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
    }
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
