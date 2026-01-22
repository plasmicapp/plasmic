import {
  CodeComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import {
  GlobalContextMeta,
  default as registerGlobalContext,
} from "@plasmicapp/host/registerGlobalContext";
import React from "react";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
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
