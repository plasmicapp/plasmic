import registerComponent, {
  CodeComponentMeta,
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

export const cartMeta: CodeComponentMeta<CartProps> = {
  name: "plasmic-commerce-cart",
  displayName: "Cart",
  description:
    "Show the size or total of the cart. See Cart Provider component to access more cart data.",
  props: {
    field: {
      type: "choice",
      options: ["Size", "Total Price"],
    },
    hideIfIsEmpty: {
      type: "boolean",
      defaultValue: false,
      description: "You can hide this component if the cart is empty",
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
  customCartMeta?: CodeComponentMeta<CartProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CartComponent, customCartMeta ?? cartMeta);
}
