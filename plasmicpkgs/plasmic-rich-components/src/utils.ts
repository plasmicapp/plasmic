import {
  ComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import {
  default as registerGlobalContext,
  GlobalContextMeta,
} from "@plasmicapp/host/registerGlobalContext";
import { default as registerToken } from "@plasmicapp/host/registerToken";
import React from "react";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
  registerToken: typeof registerToken;
};

export function makeRegisterComponent<T extends React.ComponentType<any>>(
  component: T,
  meta: ComponentMeta<React.ComponentProps<T>>
) {
  return function (loader?: Registerable) {
    registerComponentHelper(loader, component, meta);
  };
}

export function makeRegisterGlobalContext<T extends React.ComponentType<any>>(
  component: T,
  meta: GlobalContextMeta<React.ComponentProps<T>>
) {
  return function (loader?: Registerable) {
    if (loader) {
      loader.registerGlobalContext(component, meta);
    } else {
      registerGlobalContext(component, meta);
    }
  };
}

export function registerComponentHelper<T extends React.ComponentType<any>>(
  loader: Registerable | undefined,
  component: T,
  meta: ComponentMeta<React.ComponentProps<T>>
) {
  if (loader) {
    loader.registerComponent(component, meta);
  } else {
    registerComponent(component, meta);
  }
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

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    throw new Error("Expected non-null or non-undefined value");
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
  if (x === undefined || x === null) return undefined;
  return f(x);
}

export function isLikeImage(value: unknown) {
  return typeof value === "string"
    ? value.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff)$/i)
    : false;
}

// Some heuristics to avoid selecting a row when
// the object clicked is interactable -- like button, anchor,
// input, etc.  This won't be bulletproof, so just some
// heuristics!
export function isInteractable(target: HTMLElement) {
  if (["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
    return true;
  }
  if (target.contentEditable === "true") {
    return true;
  }

  return false;
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
