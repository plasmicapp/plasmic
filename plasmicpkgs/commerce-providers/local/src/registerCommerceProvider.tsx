import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { CommerceProvider } from "./local";

interface CommerceProviderProps {
  children?: React.ReactNode;
}
export const commerceProviderMeta: ComponentMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-local-provider",
  displayName: "Local Provider",
  props: {
    children: {
      type: "slot"
    },
  },
  importPath: "commerce-providers/local",
  importName: "LocalProvider",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  return (
    <CommerceProvider>
      {props.children}
    </CommerceProvider>
  )
}

export function registerCommerceProvider(
  loader?: Registerable,
  customCommerceProviderMeta?: ComponentMeta<CommerceProviderProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CommerceProviderComponent, customCommerceProviderMeta ?? commerceProviderMeta);
}
