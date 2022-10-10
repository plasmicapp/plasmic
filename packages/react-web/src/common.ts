export function notNil<T>(x: T | undefined | null): x is T {
  return x != null;
}

export function pick<T extends {}>(
  obj: T,
  ...keys: (string | number | symbol)[]
): Partial<T> {
  if (Object.keys(obj).length === 0) {
    return obj;
  }
  const res: any = {};
  for (const key of keys) {
    if (key in obj) {
      res[key] = obj[key as keyof T];
    }
  }
  return res as Partial<T>;
}

export function pickBy<T extends {}>(
  obj: T,
  func: (key: string, val: any) => boolean
): Partial<T> {
  const res: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (func(key, val)) {
      res[key] = obj[key as keyof T];
    }
  }
  return res as Partial<T>;
}

export function omit<T extends {}>(obj: T, ...keys: (keyof T)[]): Partial<T> {
  if (Object.keys(obj).length === 0) {
    return obj;
  }
  const res: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keys.includes(key)) {
      res[key] = obj[key];
    }
  }
  return res;
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
