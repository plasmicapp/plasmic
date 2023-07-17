import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import React from "react";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./shopify";
import {
  CartActionsProvider,
  globalActionsRegistrations,
} from "@plasmicpkgs/commerce";

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
      defaultValue: "next-js-store.myshopify.com",
    },
    accessToken: {
      type: "string",
      defaultValue: "ef7d41c7bf7e1c214074d0d3047bcd7b",
    },
  },
  unstable__globalActions: globalActionsRegistrations as any,
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
