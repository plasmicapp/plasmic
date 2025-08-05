import { assert, check, ensure, tuple } from "@/wab/shared/common";
import * as _ from "lodash";
import { range as lodashRange, takeWhile } from "lodash";

export interface Dict<T> {
  [key: string]: T;
}

export interface HasId {
  id: string;
}

export function mkIdMap<T extends HasId>(xs: ReadonlyArray<T>): Map<string, T> {
  return new Map(xs.map((x) => tuple(x.id, x) as [string, T]));
}

export interface HasUid {
  uid: number;
}

export function mkUidMap<T extends HasUid>(
  xs: ReadonlyArray<T>
): Map<number, T> {
  return new Map(xs.map((x) => tuple(x.uid, x)));
}

export interface HasName {
  name: string;
}

export function mkNameMap<T extends HasName>(
  xs: ReadonlyArray<T>
): Map<string, T> {
  return new Map(xs.map((x) => tuple(x.name, x)));
}

/**
 * Reorders an array to match the order in another array, where items are
 * matched using the key function.
 * @param {T[]} toReorder
 * @param {T[]} desiredOrder
 * @param {(x: T) => K} key
 * @returns {T[]}
 */
export function matchOrder<T, K>(
  toReorder: T[],
  desiredOrder: T[],
  key: (x: T) => K
): T[] {
  check(toReorder.length === desiredOrder.length);
  const key2pos = new Map(
    desiredOrder.map((y, i) => tuple(key(y), i) as [K, number])
  );
  const posForXs = toReorder.map((x) =>
    ensure(
      key2pos.get(key(x)),
      "matchOrder: desiredOrder is missing a key in toReorder"
    )
  );
  const result = toReorder.slice();
  for (const i of lodashRange(toReorder.length)) {
    result[posForXs[i]] = toReorder[i];
  }
  return result;
}

// Array manipulation functions

export function arrayInsertAt<T>(
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

export function arrayRemoveAt<T>(array: ReadonlyArray<T>, index: number) {
  return array.slice(0, index).concat(array.slice(index + 1));
}

export function arrayMoveIndex<T>(
  array: ReadonlyArray<T>,
  from: number,
  to: number
) {
  const item = array[from];
  return arrayInsertAt(arrayRemoveAt(array, from), item, to);
}

export function unzip<A, B>(xs: [A, B][]): [A[], B[]] {
  return tuple(
    xs.map(([a, b]) => a),
    xs.map(([a, b]) => b)
  );
}

export function unzip3<A, B, C>(xs: [A, B, C][]): [A[], B[], C[]] {
  return tuple(
    xs.map(([a, b, c]) => a),
    xs.map(([a, b, c]) => b),
    xs.map(([a, b, c]) => c)
  );
}

/**
 * This is a better alternative to both:
 *
 *   key in obj
 *
 * and
 *
 *   obj[key]
 *
 * Say you accidentally passed in this:
 *
 *   commitId in commitDag
 *
 * instead of:
 *
 *   commitId in commitDag.parents
 *
 * This adds a bit of additional type-checking.
 */
export function safeGet<D extends object>(dict: D, key: keyof D) {
  return dict[key];
}

export function safeHas<D extends object>(dict: D, key: keyof D) {
  return key in dict;
}

/** Based on Haskell spanWhile. Combines takeWhile and dropWhile. */
export function spanWhile<T, K>(xs: T[], keyfn: (x: T) => K): [T[], T[]] {
  const taken = takeWhile(xs, keyfn);
  const rest = xs.slice(taken.length);
  return [taken, rest];
}

export function arrayReplaceAt<T>(value: T[], index: number, x: T): T[] {
  return value.map((item, i) => (i === index ? x : item));
}

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

export function arrayInsert<T>(xs: T[], x: T, index?: number) {
  if (index === undefined) {
    xs.push(x);
  } else {
    xs.splice(index, 0, x);
  }
}

export function arrayRemoveAll<T>(xs: T[], x: T) {
  for (let i = xs.length; i--; ) {
    if (xs[i] === x) {
      xs.splice(i, 1);
    }
  }
}

export function arrayRemove<T>(xs: T[], x: T) {
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

export function filterObject<T extends Dict<any>>(
  xs: T,
  f: (entry: [k: string & keyof T, v: T[keyof T]]) => boolean
): Record<string, T[keyof T]> {
  return Object.fromEntries(Object.entries(xs).filter(f)) as any;
}

export function flatMapObject<T extends Dict<any>, K, U>(
  xs: T,
  f: (entry: [k: string & keyof T, v: T[keyof T]]) => [K, U][]
) {
  return Object.fromEntries(Object.entries(xs).flatMap(f));
}

/** Return undefined if array or object is empty. */
export function emptyToUndefined<T extends any[] | object>(
  x: T
): T | undefined {
  if (Array.isArray(x)) {
    return x.length === 0 ? undefined : x;
  } else {
    return Object.keys(x).length === 0 ? undefined : x;
  }
}

export function createMapFromObject<T extends object>(
  obj: T
): Map<keyof T, T[keyof T]> {
  return new Map(Object.entries(obj) as any);
}

export function reverseMap<K, V>(map: Map<K, V>): Map<V, K> {
  return new Map(Array.from(map.entries()).map(([k, v]) => tuple(v, k)));
}
