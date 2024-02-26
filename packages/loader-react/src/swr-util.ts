import type { useMutablePlasmicQueryData } from "@plasmicapp/query";

/**
 * It's not possible to `import { serialize } from "swr"` from RSC, as it
 * triggers "`createContext` is not a function" error :/
 *
 * So here we replicate the key serialization in order to generate the
 * appropriate cache key within data extraction.
 */
export function swrSerialize(
  key: Parameters<typeof useMutablePlasmicQueryData>[0]
): [string | null | undefined | false, any[]] {
  if (typeof key === "function") {
    try {
      key = key();
    } catch (err) {
      // dependencies not ready
      key = "";
    }
  }
  const args = [].concat(key as any);
  // If key is not falsy, or not an empty array, hash it.
  key =
    typeof key == "string"
      ? key
      : (Array.isArray(key) ? key.length : key)
      ? stableHash(key)
      : "";
  return [key as any, args];
}

const table = new WeakMap();
let counter = 0;

function stableHash(arg: any) {
  const type = typeof arg;
  const constructor = arg && arg.constructor;
  const isDate = constructor == Date;
  let result: any;
  let index;
  if (Object(arg) === arg && !isDate && constructor != RegExp) {
    // Object/function, not null/date/regexp. Use WeakMap to store the id first.
    // If it's already hashed, directly return the result.
    result = table.get(arg);
    if (result) return result;
    // Store the hash first for circular reference detection before entering the
    // recursive `stableHash` calls.
    // For other objects like set and map, we use this id directly as the hash.
    result = ++counter + "~";
    table.set(arg, result);
    if (constructor == Array) {
      // Array.
      result = "@";
      for (index = 0; index < arg.length; index++) {
        result += stableHash(arg[index]) + ",";
      }
      table.set(arg, result);
    }
    if (constructor == Object) {
      // Object, sort keys.
      result = "#";
      const keys = Object.keys(arg).sort();
      while ((index = keys.pop()) !== undefined) {
        if (arg[index] !== undefined) {
          result += index + ":" + stableHash(arg[index]) + ",";
        }
      }
      table.set(arg, result);
    }
  } else {
    result = isDate
      ? arg.toJSON()
      : type == "symbol"
      ? arg.toString()
      : type == "string"
      ? JSON.stringify(arg)
      : "" + arg;
  }
  return result;
}
