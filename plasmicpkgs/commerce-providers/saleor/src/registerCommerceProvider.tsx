import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import React from "react";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./saleor";

interface CommerceProviderProps {
  children?: React.ReactNode;
  saleorApiUrl: string;
}
export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-saleor-provider",
  displayName: "Saleor Provider",
  props: {
    saleorApiUrl: {
      type: "string",
      defaultValue: "https://vercel.saleor.cloud/graphql/",
    },
  },
  importPath: "@plasmicpkgs/commerce-saleor",
  importName: "SaleorProvider",
};

function CommerceProviderComponent(props: CommerceProviderProps) {
  const { saleorApiUrl, children } = props;

  const CommerceProvider = React.useMemo(
    () => getCommerceProvider(saleorApiUrl),
    [saleorApiUrl]
  );

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
