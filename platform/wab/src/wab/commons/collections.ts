import { assert, tuple } from "@/wab/shared/common";
import * as _ from "lodash";
const memoizeOne = ((m: any) => m.default || m)(require("memoize-one"));

export function insertArray<T>(
  array: ReadonlyArray<T>,
  item: T,
  index?: number
) {
  if (index === undefined) {
    return array.concat([item]);
  } else {
    return _.slice(array, 0, index)
      .concat([item])
      .concat(_.slice(array, index));
  }
}

export function withoutArrayIndex<T>(array: ReadonlyArray<T>, index: number) {
  return array.slice(0, index).concat(array.slice(index + 1));
}

export function merged<T>(obj1: T, obj2: Partial<T>): T {
  return Object.assign({ __proto__: (obj1 as any).__proto__ }, obj1, obj2);
}

export type DeepMergeable<T> =
  | { [P in keyof T]?: DeepMergeable<T[P]> | ((x: T[P]) => T[P]) }
  | ((x: T) => T);
/**
 * Deeply merge obj2 into obj1, creating a new object without mutating either.
 * For values in obj2, can pass in a function instead of an actual value; then the
 * corresponding slot will be replaced by calling that function with the corresponding
 * value from obj1.
 *
 * Lightly tested...
 */
export function deepMerged<T>(obj1: T, obj2: DeepMergeable<T>): T {
  if (_.isFunction(obj2)) {
    return obj2(obj1);
  } else if (
    (_.isPlainObject(obj1) && _.isPlainObject(obj2)) ||
    (_.isObjectLike(obj1) && !_.isArray(obj1) && _.isPlainObject(obj2))
  ) {
    // We only deep-merge obj2 to obj1 if they are both "plain objects", or if
    // obj1 is a class instance (except for array) and obj2 is a plain object.
    // Specifically, if both obj1 and obj2 are class instances, then we don't
    // perform a deep merge; instead, we just return obj2.
    const newVals = Object.fromEntries(
      Object.entries(obj2).map(([key, val]) => {
        return [key, deepMerged(obj1[key], val)];
      })
    ) as Partial<T>;
    return merged(obj1, newVals);
  } else if (_.isPlainObject(obj2)) {
    return Object.fromEntries(
      Object.entries(obj2).map(([key, val]) =>
        tuple(key, deepMerged(undefined, val as any))
      )
    ) as unknown as T;
  } else {
    return obj2 as any;
  }
}

/**
 * Shallow comparison of two arrays
 */
export function arrayEqual<T>(a1: ReadonlyArray<T>, a2: ReadonlyArray<T>) {
  if (a1 === a2) {
    return true;
  }
  if (a1.length !== a2.length) {
    return false;
  }
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
}

export function insertAt<T>(xs: T[], x: T, index?: number) {
  if (index === undefined) {
    xs.push(x);
  } else {
    xs.splice(index, 0, x);
  }
}

export function removeAllFromArray<T>(xs: T[], x: T) {
  for (let i = xs.length; i--; ) {
    if (xs[i] === x) {
      xs.splice(i, 1);
    }
  }
}

export function removeFromArray<T>(xs: T[], x: T) {
  const i = tryRemoveFromArray(xs, x);
  assert(i !== -1);
}

export function tryRemoveFromArray<T>(xs: T[], x: T) {
  const i = xs.indexOf(x);
  if (i !== -1) {
    xs.splice(i, 1);
  }
  return i;
}

export function arrayReversed<T>(xs: ReadonlyArray<T>) {
  return xs.slice().reverse();
}

/**
 * Given an array of elemnts and `undefined`, filters out all `undefined`
 */
export function onlyDefined<T>(arr: (T | undefined)[]): T[] {
  return arr.filter((x) => x !== undefined) as T[];
}

/**
 * Given an array of elemnts and `undefined`, filters out all `undefined`
 */
export function onlyDefinedValues<T>(
  obj: Record<string, T | undefined>
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, val]: [string, any]) => val !== undefined)
  ) as Record<string, T>;
}
