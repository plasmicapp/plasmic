import {
  ComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import { default as registerGlobalContext } from "@plasmicapp/host/registerGlobalContext";
import { default as registerToken } from "@plasmicapp/host/registerToken";
import React from "react";

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
