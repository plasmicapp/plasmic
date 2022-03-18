import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { getCommerceProvider } from "./swell";

interface CommerceProviderProps {
  children?: React.ReactNode;
  storeId?: string;
  publicKey?: string;

}
export const commerceProviderMeta: ComponentMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-swell-provider",
  displayName: "Swell Provider",
  props: {
    children: {
      type: "slot"
    },
    storeId: "string",
    publicKey: "string"

  },
  importPath: "commerce-providers/swell",
  importName: "SwellProvider",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  const { storeId, publicKey, children } = props;

  if (!storeId) {
    return <p> You must set the store id </p>
  } else if (!publicKey) {
    return <p> You must set the public key </p>
  }
  
  const CommerceProvider = getCommerceProvider(storeId, publicKey);

  return (
    <CommerceProvider>
      {children}
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
