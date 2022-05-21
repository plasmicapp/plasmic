import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import React from "react";
import { Registerable } from "./registerable";
import { getCommerceProvider } from "./swell";

interface CommerceProviderProps {
  children?: React.ReactNode;
  storeId: string;
  publicKey: string;
}
export const commerceProviderMeta: GlobalContextMeta<CommerceProviderProps> = {
  name: "plasmic-commerce-swell-provider",
  displayName: "Swell Provider",
  props: {
    storeId: {
      type: "string",
      defaultValue: "plasmic-sandbox",
    },
    publicKey: {
      type: "string",
      defaultValue: "pk_QaZeGhtpQaVbNQnWJdRlE1abE6Ezf9U9",
    },
  },
  description: `Get your store ID and public storefront API key from the Swell admin UI under Developer > API Keys.

[Watch how to use this integration](https://plasmic-sandbox.swell.store/admin/settings/api).`,
  importPath: "@plasmicpkgs/commerce-swell",
  importName: "CommerceProviderComponent",
};

export function CommerceProviderComponent(props: CommerceProviderProps) {
  const { storeId, publicKey, children } = props;

  const CommerceProvider = getCommerceProvider(storeId, publicKey);

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
