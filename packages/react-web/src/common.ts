import classNames from "classnames";

export const NONE = Symbol("NONE");

export function notNil<T>(x: T | undefined | null): x is T {
  return x != null;
}

export function pick<T>(
  obj: T,
  ...keys: (string | number | symbol)[]
): Partial<T> {
  const res: any = {};
  for (const key of keys) {
    if (key in obj) {
      res[key] = obj[key as keyof T];
    }
  }
  return res as Partial<T>;
}

export function omit<T>(obj: T, ...keys: (keyof T)[]): Partial<T> {
  const res: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keys.includes(key)) {
      res[key] = obj[key];
    }
  }
  return res;
}

export function mergeProps(
  props: Record<string, any>,
  ...restProps: Record<string, any>[]
): Record<string, any> {
  const result = { ...props };

  for (const rest of restProps) {
    for (const key of Object.keys(rest)) {
      result[key] = mergePropVals(key, result[key], rest[key]);
    }
  }

  return result;
}

export function mergePropVals(name: string, val1: any, val2: any): any {
  if (val1 === NONE || val2 === NONE) {
    // The NONE sentinel always skips all merging and returns null
    return null;
  } else if (val1 == null) {
    // If either of them is nil, prefer the other
    return val2;
  } else if (val2 == null) {
    return val1;
  } else if (typeof val1 !== typeof val2) {
    // If the type of the two values are different, then no way to merge them.
    // Prefer val2.
    return val2;
  } else if (name === "className") {
    // Special case for className -- always combine both class names
    return classNames(val1, val2);
  } else if (name === "style") {
    // Special case for style -- always shallow-merge style dicts
    return { ...val1, ...val2 };
  } else if (name.startsWith("on") && typeof val1 === "function") {
    // Special case for event handlers -- always call both handlers
    return (...args: any[]) => {
      let res: any;
      if (typeof val1 === "function") {
        res = val1(...args);
      }
      if (typeof val2 === "function") {
        res = val2(...args);
      }
      return res;
    };
  } else {
    // For all else, prefer val2
    return val2;
  }
}

export function isSubset<T>(a1: T[], a2: T[]) {
  return a1.every((x) => a2.includes(x));
}

export function chainSingleArgFuncs<A>(...funcs: ((arg: A) => A)[]) {
  if (funcs.length === 0) {
    return undefined;
  }
  return (arg: A) => {
    let res: A = arg;
    for (const func of funcs) {
      res = func(res);
    }
    return res;
  };
}

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

export function isString(x: any): x is string {
  return typeof x === "string";
}

export function groupBy<T>(
  collection: T[],
  keyFunc: (x: T) => string
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const obj of collection) {
    const key = keyFunc(obj);
    if (key in result) {
      result[key].push(obj);
    } else {
      result[key] = [obj];
    }
  }
  return result;
}

export function mapValues<V, V2>(
  obj: Record<string, V>,
  mapper: (value: V) => V2
): Record<string, V2> {
  const result: Record<string, V2> = {};
  for (const key in obj) {
    result[key] = mapper(obj[key]);
  }
  return result;
}
