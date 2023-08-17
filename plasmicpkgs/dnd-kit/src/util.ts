import React from "react";
import {
  ComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import {
  default as registerGlobalContext,
  GlobalContextMeta,
} from "@plasmicapp/host/registerGlobalContext";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
  registerToken: typeof registerToken;
};

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
