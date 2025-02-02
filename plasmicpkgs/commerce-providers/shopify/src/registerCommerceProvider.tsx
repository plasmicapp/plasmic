import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  CartActionsProvider,
  globalActionsRegistrations,
} from "@plasmicpkgs/commerce";
import React from "react";
import { defaultAccessToken, defaultStoreDomain } from "./graphql-config";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./shopify";

interface CommerceProviderProps {
  children?: React.ReactNode;
  storeDomain: string;
  accessToken: string;
}

const globalContextName = "plasmic-commerce-shopify-provider";

export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: globalContextName,
  displayName: "Shopify Provider",
  props: {
    storeDomain: {
      type: "string",
      defaultValue: defaultStoreDomain,
    },
    accessToken: {
      type: "string",
      defaultValue: defaultAccessToken,
    },
  },
  ...{ globalActions: globalActionsRegistrations },
  description: `Your store domain usually looks like **storename.myshopify.com**.

For your access token, get it by following [this video](https://www.youtube.com/watch?v=wB_6cM7tdv4).

See also the [getting started video](https://www.youtube.com/watch?v=1OJ_gXmta2Q).`,
  importPath: "@plasmicpkgs/commerce-shopify",
  importName: "CommerceProviderComponent",
};

export function CommerceProviderComponent(props: CommerceProviderProps) {
  const { storeDomain, accessToken, children } = props;

  const CommerceProvider = React.useMemo(
    () => getCommerceProvider(storeDomain, accessToken),
    [storeDomain, accessToken]
  );

  return (
    <CommerceProvider>
      <CartActionsProvider globalContextName={globalContextName}>
        {children}
      </CartActionsProvider>
    </CommerceProvider>
  );
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
