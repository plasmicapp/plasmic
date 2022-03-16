import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { getCommerceProvider } from "./shopify";

interface CommerceProviderProps {
  children?: React.ReactNode;
  storeDomain?: string;
  accessToken?: string;

}
export const commerceProviderMeta: ComponentMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-shopify-provider",
  displayName: "Shopify Provider",
  props: {
    children: {
      type: "slot"
    },
    storeDomain: "string",
    accessToken: "string"

  },
  importPath: "commerce-providers/shopify",
  importName: "ShopifyProvider",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  const { storeDomain, accessToken, children } = props;

  if (!storeDomain) {
    return <p> You must set the store domain url </p>
  } else if (!accessToken) {
    return <p> You must set the access token </p>
  }
  
  const CommerceProvider = getCommerceProvider(storeDomain, accessToken);

  return (
    <CommerceProvider>
      <div>{children}</div>
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
