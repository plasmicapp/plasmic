import { DataProvider } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import useCart from "./cart/use-cart";
import { Registerable } from "./registerable";

export const cartProviderMeta: CodeComponentMeta<
  React.PropsWithChildren<object>
> = {
  name: "plasmic-commerce-cart-provider",
  displayName: "Cart Provider",
  description:
    "Use this to create bespoke cart UI. Inside Cart Provider, use dynamic values to access cart data.",
  props: {
    children: "slot",
  },
  providesData: true,
  importPath: "@plasmicpkgs/commerce",
  importName: "CartProvider",
};

export function CartProvider(props: React.PropsWithChildren<object>) {
  const { data } = useCart();
  return (
    <DataProvider data={data} name="cart">
      {props.children}
    </DataProvider>
  );
}

export function registerCartProvider(
  loader?: Registerable,
  customCartProviderMeta?: CodeComponentMeta<React.PropsWithChildren<object>>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CartProvider, customCartProviderMeta ?? cartProviderMeta);
}
