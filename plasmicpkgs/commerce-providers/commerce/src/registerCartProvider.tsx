import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { Children } from "react";
import useCart from "./cart/use-cart";
import usePrice from "./product/use-price";
import { Registerable } from "./registerable";
import { DataProvider } from "@plasmicapp/host";

export const cartProviderMeta: ComponentMeta<React.PropsWithChildren<object>> =
  {
    name: "plasmic-commerce-cart-provider",
    displayName: "Cart Provider",
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
  customCartProviderMeta?: ComponentMeta<React.PropsWithChildren<object>>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CartProvider, customCartProviderMeta ?? cartProviderMeta);
}
