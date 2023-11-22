import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  CartActionsProvider,
  globalActionsRegistrations,
} from "@plasmicpkgs/commerce";
import React from "react";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./saleor";

interface CommerceProviderProps {
  children?: React.ReactNode;
  saleorApiUrl: string;
}

const globalContextName = "plasmic-commerce-saleor-provider";

export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: globalContextName,
  displayName: "Saleor Provider",
  props: {
    saleorApiUrl: {
      type: "string",
      defaultValue: "https://vercel.saleor.cloud/graphql/",
    },
  },
  ...{ globalActions: globalActionsRegistrations },
  importPath: "@plasmicpkgs/commerce-saleor",
  importName: "CommerceProviderComponent",
};

export function CommerceProviderComponent(props: CommerceProviderProps) {
  const { saleorApiUrl, children } = props;

  const CommerceProvider = React.useMemo(
    () => getCommerceProvider(saleorApiUrl),
    [saleorApiUrl]
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
