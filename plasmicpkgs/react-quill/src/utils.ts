import {
  CodeComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import {
  GlobalContextMeta,
  default as registerGlobalContext,
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
  meta: CodeComponentMeta<React.ComponentProps<T>>
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
  meta: CodeComponentMeta<React.ComponentProps<T>>
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
