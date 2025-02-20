export function swallow<T>(f: () => T): T | undefined {
  try {
    return f();
  } catch {
    return undefined;
  }
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const res: any = {};
  for (const key of keys) {
    if (key in obj) {
      res[key] = obj[key as keyof T];
    }
  }
  return res;
}

type ReactElt = {
  children: ReactElt | ReactElt[];
  props: {
    children: ReactElt | ReactElt[];
    [prop: string]: any;
  } | null;
  type: React.ComponentType<any> | null;
  key: string | null;
} | null;

export function traverseReactEltTree(
  children: React.ReactNode,
  callback: (elt: ReactElt) => void
) {
  const rec = (elts: ReactElt | ReactElt[] | null) => {
    (Array.isArray(elts) ? elts : [elts]).forEach((elt) => {
      if (elt) {
        callback(elt);
        if (elt.children) {
          rec(elt.children);
        }
        if (elt.props?.children && elt.props.children !== elt.children) {
          rec(elt.props.children);
        }
      }
    });
  };
  rec(children as any);
}

export function asArray<T>(x: T[] | T | undefined | null) {
  if (Array.isArray(x)) {
    return x;
  } else if (x == null) {
    return [];
  } else {
    return [x];
  }
}

export function ensureNumber(x: number | string): number {
  return x as number;
}

export function ensure<T>(x: T | null | undefined, msg: string): T {
  if (x === null || x === undefined) {
    throw new Error("Expected non-null or non-undefined value: " + msg);
  }
  return x;
}

export function isOneOf<T, U extends T>(elem: T, arr: readonly U[]): elem is U {
  return arr.includes(elem as any);
}

export function maybe<T, U>(
  x: T | undefined | null,
  f: (y: T) => U
): U | undefined {
  if (x === undefined || x === null) {
    return undefined;
  }
  return f(x);
}

export function isLikeImage(value: unknown) {
  return typeof value === "string"
    ? value.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff)$/i)
    : false;
}

export function ensureArray<T>(xs: T | T[]): T[] {
  return Array.isArray(xs) ? xs : [xs];
}

export const tuple = <T extends any[]>(...args: T): T => args;

export interface HasId {
  id: string;
}

export function mkIdMap<T extends HasId>(xs: ReadonlyArray<T>): Map<string, T> {
  return new Map(xs.map((x) => tuple(x.id, x) as [string, T]));
}

export const mkShortId = () => `${Math.random()}`;

export function withoutNils<T>(xs: Array<T | undefined | null>): T[] {
  return xs.filter((x): x is T => x != null);
}

export type Falsey = null | undefined | false | "" | 0 | 0n;
export type Truthy<T> = T extends Falsey ? never : T;

export function withoutFalsey<T>(xs: Array<T | Falsey>): T[] {
  return xs.filter((x): x is T => !!x);
}
