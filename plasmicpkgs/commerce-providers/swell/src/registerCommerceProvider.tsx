import { Registerable } from "./registerable";
import React from "react";
import { getCommerceProvider } from "./swell";
import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";

interface CommerceProviderProps {
  children?: React.ReactNode;
  storeId: string;
  publicKey: string;

}
export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-swell-provider",
  displayName: "Swell Provider",
  props: {
    storeId: "string",
    publicKey: "string"

  },
  importPath: "commerce-providers/swell",
  importName: "SwellProvider",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  const { storeId, publicKey, children } = props;
  
  const CommerceProvider = getCommerceProvider(storeId, publicKey);

  return (
    <CommerceProvider>
      {children}
    </CommerceProvider>
  )
}

export function registerCommerceProvider(
  loader?: Registerable,
  customCommerceProviderMeta?: GlobalContextMeta<CommerceProviderProps>
) {
  const doRegisterComponent: typeof registerGlobalContext = (...args) =>
    loader ? loader.registerGlobalContext(...args) : registerGlobalContext(...args);
  doRegisterComponent(CommerceProviderComponent, customCommerceProviderMeta ?? commerceProviderMeta);
}