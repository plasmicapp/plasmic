import get from "dlv";
import { useEffect, useLayoutEffect } from "react";
import { $State } from ".";

export function generateStateOnChangeProp(
  $state: $State,
  stateName: string,
  dataReps: number[]
): (val: any, path: (string | number)[]) => void {
  return (val, path) => set($state, [stateName, ...dataReps, ...path], val);
}

/**
 * This function generate the state value prop for repeated states
 * Example:
 *   - parent[][].counter[].count
 * We need to pass `parent[index1][index2].counter to the child component
 */
export function generateStateValueProp(
  $state: $State,
  path: (string | number)[] // ["parent", 0, 1, "counter"]
) {
  return get($state, path);
}

/**
 * Forked from https://github.com/lukeed/dset
 * Changes: fixed setting a deep value to a proxy object
 */
export function set(obj: any, keys: any, val: any) {
  keys = keys.split ? keys.split(".") : keys;
  var i = 0,
    l = keys.length,
    t = obj,
    x,
    k;
  while (i < l) {
    k = keys[i++];
    if (k === "__proto__" || k === "constructor" || k === "prototype") break;
    if (i === l) {
      t[k] = val;
      t = t[k];
    } else {
      if (typeof (x = t[k]) === typeof keys) {
        t = t[k] = x;
      } else if (keys[i] * 0 !== 0 || !!~("" + keys[i]).indexOf(".")) {
        t[k] = {};
        t = t[k];
      } else {
        t[k] = [];
        t = t[k];
      }
    }
  }
}

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export { get };
