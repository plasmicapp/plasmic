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
  const i = xs.indexOf(x);
  if (i !== -1) {
    xs.splice(i, 1);
  } else {
    assert(false, "Could not find element in array to remove");
  }
}

export function arrayReversed<T>(xs: ReadonlyArray<T>) {
  return xs.slice().reverse();
}
