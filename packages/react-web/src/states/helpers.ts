import get from "dlv";
import { useEffect, useLayoutEffect } from "react";
import { ensure } from "../common";
import { StateSpecNode } from "./graph";
import {
  $State,
  ARRAY_SYMBOL,
  ObjectPath,
  PLASMIC_STATE_PROXY_SYMBOL,
  StateCell,
} from "./types";
import { proxyObjToStateCell, tryGetStateCellFrom$StateRoot } from "./valtio";

export function generateStateOnChangeProp(
  $state: $State,
  path: ObjectPath
): (val: any) => void {
  return (val) => set($state, path, val);
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

export function getStateCells(
  $state: $State,
  root: StateSpecNode<any>
): StateCell<any>[] {
  if ($state == null || typeof $state !== "object") {
    return [];
  }
  const stateCells = Object.values(
    proxyObjToStateCell.get($state) ?? {}
  ) as StateCell<any>[];
  if (root.isLeaf()) {
    return stateCells;
  }
  if (root.hasArrayTransition()) {
    return [
      ...stateCells,
      ...Object.keys($state).flatMap((key) =>
        getStateCells($state[key], ensure(root.makeTransition(ARRAY_SYMBOL)))
      ),
    ];
  } else {
    return [
      ...stateCells,
      ...[...root.edges().entries()].flatMap(([key, child]) =>
        typeof key === "string" && key in $state
          ? getStateCells($state[key], child)
          : []
      ),
    ];
  }
}

export function getStateCellsInPlasmicProxy(
  obj: any
): { realPath: ObjectPath; path: string }[] {
  if (!isPlasmicStateProxy(obj)) {
    return [];
  }
  const { node: rootNode, path: rootPath, isOutside } = obj[
    PLASMIC_STATE_PROXY_SYMBOL
  ];
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
  const { node, isOutside } = obj[PLASMIC_STATE_PROXY_SYMBOL] as {
    node: StateSpecNode<any>;
    isOutside: boolean;
  };
  const nextNode = node.makeTransition(path[path.length - 1]);
  if (isOutside || node.isLeaf() || !nextNode) {
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
    k = keys[i++];
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
