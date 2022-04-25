import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import useCart from "./cart/use-cart";
import usePrice from "./product/use-price";
import { Registerable } from "./registerable";

interface CartProps {
  className?: string;
  field: string;
  hideIfIsEmpty?: boolean;
}

export const cartMeta: ComponentMeta<CartProps> = {
  name: "plasmic-commerce-cart",
  displayName: "Cart",
  props: {
    field: {
      type: "choice",
      options: ["Size", "Total Price"],
    },
    hideIfIsEmpty: {
      type: "boolean",
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "CartComponent",
};

export function CartComponent(props: CartProps) {
  const { className, field, hideIfIsEmpty } = props;

  const { data } = useCart();
  const { price } = usePrice({
    amount: data?.totalPrice ?? 0,
    currencyCode: data?.currency.code ?? "USD",
  });
  if (!field) {
    return <p>You must set the field prop</p>;
  }

  let value;
  if (field === "Size") {
    value = data?.lineItems.length ?? 0;
  } else if (field === "Total Price") {
    value = price ?? 0;
  }

  return hideIfIsEmpty && value === 0 ? null : (
    <span className={className}>{value}</span>
  );
}

export function registerCart(
  loader?: Registerable,
  customCartMeta?: ComponentMeta<CartProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CartComponent, customCartMeta ?? cartMeta);
}
