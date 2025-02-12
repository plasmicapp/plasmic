import type { ComponentHelpers } from "@plasmicapp/host";
import get from "dlv";
import { useEffect, useLayoutEffect } from "react";
import { getVersion as isValtioProxy } from "valtio";
import { ensure } from "../common";
import { StateSpecNode } from "./graph";
import {
  $State,
  ARRAY_SYMBOL,
  InitFunc,
  ObjectPath,
  PLASMIC_STATE_PROXY_SYMBOL,
  StateCell,
} from "./types";
import { proxyObjToStateCell, tryGetStateCellFrom$StateRoot } from "./valtio";

export function initializeCodeComponentStates(
  $state: $State,
  states: {
    name: string;
    plasmicStateName: string;
  }[],
  repetitionIndex: number[],
  componentHelpers: ComponentHelpers<any>,
  child$Props: Record<string, any>
) {
  const stateHelpers = componentHelpers?.states ?? {};
  for (const { name, plasmicStateName } of states) {
    if (name in stateHelpers && "initFunc" in stateHelpers[name]) {
      $state.registerInitFunc?.(
        plasmicStateName,
        ({ $props }) => stateHelpers[name].initFunc?.($props),
        repetitionIndex ?? [],
        { $props: child$Props }
      );
    }
  }
}

export function generateOnMutateForSpec(
  stateName: string,
  componentHelpers: ComponentHelpers<any>
) {
  return componentHelpers?.states?.[stateName]?.onMutate;
}

export function initializePlasmicStates(
  $state: $State,
  states: {
    name: string;
    initFunc: InitFunc<any>;
  }[],
  repetitionIndex: number[]
) {
  for (const { name, initFunc } of states) {
    $state.registerInitFunc?.(name, initFunc, repetitionIndex ?? []);
  }
}

export function generateStateOnChangeProp(
  $state: $State,
  path: ObjectPath
): (val: any) => void {
  return (val) => set($state, path, val);
}

export function generateStateOnChangePropForCodeComponents(
  $state: $State,
  stateName: string,
  plasmicStatePath: ObjectPath,
  componentHelpers: ComponentHelpers<any>
): (val: any) => void {
  const onChangeArgsToValue =
    componentHelpers?.states?.[stateName]?.onChangeArgsToValue;
  if (!onChangeArgsToValue || typeof onChangeArgsToValue !== "function") {
    return generateStateOnChangeProp($state, plasmicStatePath);
  }
  return (...args) =>
    generateStateOnChangeProp(
      $state,
      plasmicStatePath
    )(onChangeArgsToValue.apply(null, args));
}

export function generateStateValueProp($state: $State, path: ObjectPath) {
  return get($state, path);
}

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function isPlasmicStateProxy(obj: any) {
  return (
    obj != null && typeof obj === "object" && !!obj[PLASMIC_STATE_PROXY_SYMBOL]
  );
}

export function is$StateProxy(obj: any) {
  return (
    obj != null &&
    typeof obj === "object" &&
    (!!obj[PLASMIC_STATE_PROXY_SYMBOL] || isValtioProxy(obj))
  );
}

export function getStateCells(
  $state: $State,
  root: StateSpecNode<any>
): StateCell<any>[] {
  if ($state == null || typeof $state !== "object") {
    return [];
  }

  if (root.hasArrayTransition()) {
    return Object.keys($state).flatMap((key) =>
      getStateCells($state[key], ensure(root.makeTransition(ARRAY_SYMBOL)))
    );
  } else {
    const stateCell = proxyObjToStateCell.get($state) ?? {};
    const stateCells: StateCell<any>[] = [];
    for (const [key, child] of root.edges().entries()) {
      if (typeof key === "string" && key in $state) {
        stateCells.push(...getStateCells($state[key], child));
        if (key in stateCell) {
          stateCells.push(stateCell[key]);
        }
      }
    }
    return stateCells;
  }
}

export function getStateCellsInPlasmicProxy(
  obj: any
): { realPath: ObjectPath; path: string }[] {
  if (!isPlasmicStateProxy(obj)) {
    return [];
  }
  const {
    node: rootNode,
    path: rootPath,
    isOutside,
  } = obj[PLASMIC_STATE_PROXY_SYMBOL];
  if (isOutside) {
    return [];
  }
  return getStateCells(obj, rootNode).map((stateCell) => ({
    path: stateCell.node.getSpec().path,
    realPath: stateCell.path.slice(rootPath.length),
  }));
}

export function getStateSpecInPlasmicProxy(obj: any, path: ObjectPath) {
  obj = get(obj, path.slice(0, path.length - 1));
  if (!isPlasmicStateProxy(obj)) {
    return undefined;
  }
  const { node } = obj[PLASMIC_STATE_PROXY_SYMBOL] as {
    node: StateSpecNode<any>;
  };
  const nextNode = node.makeTransition(path[path.length - 1]);
  if (node.isLeaf() || !nextNode) {
    return undefined;
  }
  return {
    spec: nextNode.getSpec(),
    isImplicitStateArray: nextNode.hasArrayTransition(),
  };
}

export function getCurrentInitialValue(obj: any, path: ObjectPath) {
  if (!isPlasmicStateProxy(obj)) {
    return undefined;
  }
  return tryGetStateCellFrom$StateRoot(obj, path)?.initialValue;
}

export function resetToInitialValue(obj: any, path: ObjectPath) {
  const stateCell = tryGetStateCellFrom$StateRoot(obj, path);
  if (stateCell) {
    set(obj, path, stateCell.initialValue);
  }
}

export function shallowEqual<T>(a1: T[], a2: T[]) {
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

/**
 * Shallow comparison of arrays.
 */
export function arrayEq(xs: ReadonlyArray<any>, ys: ReadonlyArray<any>) {
  return (
    xs.length === ys.length && xs.every((_, index) => xs[index] === ys[index])
  );
}

export function isNum(value: string | number | symbol): value is number {
  return typeof value === "symbol" ? false : !isNaN(+value);
}

type StringGen = string | (() => string);
export function assert<T>(
  cond: T,
  msg: StringGen = "Assertion failed"
): asserts cond {
  if (!cond) {
    // We always generate an non empty message so that it doesn't get swallowed
    // by the async library.
    msg = (typeof msg === "string" ? msg : msg()) || "Assertion failed";
    debugger;
    throw new Error(msg);
  }
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
    k = "" + keys[i++];
    if (k === "__proto__" || k === "constructor" || k === "prototype") break;
    const newValue =
      i === l
        ? val
        : typeof (x = t[k]) === typeof keys
        ? x
        : keys[i] * 0 !== 0 || !!~("" + keys[i]).indexOf(".")
        ? {}
        : [];
    assignValue(t, k, newValue);
    t = t[k];
  }
}

/**
 * Forked from lodash
 */
function baseAssignValue(object: any, key: any, value: any) {
  if (key == "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      value: value,
      writable: true,
    });
  } else {
    object[key] = value;
  }
}

function eq(value: any, other: any) {
  return value === other || (value !== value && other !== other);
}

function assignValue(object: any, key: any, value: any) {
  const objValue = object[key];
  if (
    !(
      Object.prototype.hasOwnProperty.call(object, key) && eq(objValue, value)
    ) ||
    (value === undefined && !(key in object))
  ) {
    baseAssignValue(object, key, value);
  }
}

const isInstanceOfMap = (a: any) =>
  a != null &&
  typeof a === "object" &&
  "size" in a &&
  typeof a.entries === "function" &&
  typeof a.get === "function" &&
  typeof a.set === "function" &&
  typeof a.has === "function";

const isInstanceOfSet = (a: any) =>
  a != null &&
  typeof a === "object" &&
  "size" in a &&
  typeof a.entries === "function" &&
  typeof a.add === "function" &&
  typeof a.has === "function" &&
  typeof a.delete === "function";

const isRegExp = (a: any) =>
  Object.prototype.toString.call(a) === "[object RegExp]";

/**
 * Forked from https://github.com/epoberezkin/fast-deep-equal/blob/master/src/index.jst
 * Changes: removed the comparison between constructors and instanceof objects
 * because they are dependent on the window object
 */
export function deepEqual(a: any, b: any) {
  if (a === b) return true;

  if (a && b && typeof a == "object" && typeof b == "object") {
    // if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0; ) if (!deepEqual(a[i], b[i])) return false;
      return true;
    }

    // if ((a instanceof Map) && (b instanceof Map)) {
    if (isInstanceOfMap(a) && isInstanceOfMap(b)) {
      if (a.size !== b.size) return false;
      for (i of a.entries()) if (!b.has(i[0])) return false;
      for (i of a.entries()) if (!deepEqual(i[1], b.get(i[0]))) return false;
      return true;
    }

    // if ((a instanceof Set) && (b instanceof Set)) {
    if (isInstanceOfSet(a) && isInstanceOfSet(b)) {
      if (a.size !== b.size) return false;
      for (i of a.entries()) if (!b.has(i[0])) return false;
      return true;
    }

    // if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (isRegExp(a) && isRegExp(b))
      return a.source === b.source && a.flags === b.flags;
    // if (a.valueOf !== Object.prototype.valueOf)
    //   return a.valueOf() === b.valueOf();
    // if (a.toString !== Object.prototype.toString)
    //   return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (key === "_owner" && a.$$typeof) {
        // React-specific: avoid traversing React elements' _owner.
        //  _owner contains circular references
        // and is not needed when comparing the actual elements (and not their owners)
        continue;
      }
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a !== a && b !== b;
}
