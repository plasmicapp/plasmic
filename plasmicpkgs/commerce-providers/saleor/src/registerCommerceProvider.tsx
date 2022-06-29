import { Registerable } from "./registerable";
import React from "react";
import { getCommerceProvider } from "./saleor";
import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";

interface CommerceProviderProps {
  children?: React.ReactNode;
  saleorApiUrl: string;
}
export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-saleor-provider",
  displayName: "Saleor Provider",
  props: {
    saleorApiUrl: "string",
    defaultValue: 'https://vercel.saleor.cloud/graphql/'
  },
  importPath: "commerce-providers/saleor",
  importName: "SaleorProvider",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  const { saleorApiUrl, children } = props;

  const CommerceProvider = getCommerceProvider(saleorApiUrl);

  return <CommerceProvider>{children}</CommerceProvider>;
}

export function registerCommerceProvider(
  loader?: Registerable,
  customCommerceProviderMeta?: GlobalContextMeta<CommerceProviderProps>
) {
  const doRegisterComponent: typeof registerGlobalContext = (...args: any) =>
    loader
      ? loader.registerGlobalContext(...args)
      : registerGlobalContext(...args);
  doRegisterComponent(
    CommerceProviderComponent,
    customCommerceProviderMeta ?? commerceProviderMeta
  );
}
