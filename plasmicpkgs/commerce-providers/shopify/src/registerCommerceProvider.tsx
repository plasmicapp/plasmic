import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import React from "react";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./shopify";

interface CommerceProviderProps {
  children?: React.ReactNode;
  storeDomain: string;
  accessToken: string;
}
export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-shopify-provider",
  displayName: "Shopify Provider",
  props: {
    storeDomain: {
      type: "string",
      defaultValue: "next-js-store.myshopify.com",
    },
    accessToken: {
      type: "string",
      defaultValue: "ef7d41c7bf7e1c214074d0d3047bcd7b",
    },
  },
  description: `Your store domain should look like **storename.myshopify.com**.
    For your access token, get it by following [this video](https://www.youtube.com/watch?v=wB_6cM7tdv4).`,
  importPath: "@plasmicpkgs/commerce-shopify",
  importName: "CommerceProviderComponent",
};

export function CommerceProviderComponent(props: CommerceProviderProps) {
  const { storeDomain, accessToken, children } = props;

  const CommerceProvider = getCommerceProvider(storeDomain, accessToken);

  return <CommerceProvider>{children}</CommerceProvider>;
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
