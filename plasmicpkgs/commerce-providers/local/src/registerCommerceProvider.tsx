import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import React from "react";
import { CommerceProvider } from "./local";
import { Registerable } from "./registerable";

interface CommerceProviderProps {
  children?: React.ReactNode;
}

export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-local-provider",
  displayName: "Local Provider",
  props: {},
  importPath: "@plasmicpkgs/commerce-local",
  importName: "CommerceProviderComponent",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  return <CommerceProvider>{props.children}</CommerceProvider>;
}

export function registerCommerceProvider(
  loader?: Registerable,
  customCommerceProviderMeta?: GlobalContextMeta<CommerceProviderProps>
) {
  const doRegisterComponent: typeof registerGlobalContext = (...args) =>
    loader
      ? loader.registerGlobalContext(...args)
      : registerGlobalContext(...args);
  doRegisterComponent(
    CommerceProviderComponent,
    customCommerceProviderMeta ?? commerceProviderMeta
  );
}
