import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import useCart from "./cart/use-cart";
import usePrice from "./product/use-price";

interface UseCartProps {
  className?: string;
  field: string;
}

export const useCartMeta: ComponentMeta<UseCartProps> = {
  name: "plasmic-commerce-use-cart",
  displayName: "Use Cart",
  props: {
    field: {
      type: "choice",
      options: ["Size", "Total Price"],
    },
  },
  importPath: "commerce-providers/commerce",
  importName: "UseCart",
};

function UseCartComponent(props: UseCartProps) {
  const { className, field } = props;

  const { data } = useCart();
  const { price } = usePrice({
    amount: data?.totalPrice ?? 0,
    currencyCode: data?.currency.code ?? "USD"
  })
  if (!field) {
    return <p>You must set the field prop</p>
  }

  let value;
  if (field === "Size") {
    value = `${data?.lineItems.length ?? 0}`;
  } else if (field === "Total Price") {
    value = `${price}`;
  }

  return (
    <span className={className}>{value}</span>
  )
}

export function registerUseCart(
  loader?: Registerable,
  customUseCartMeta?: ComponentMeta<UseCartProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(UseCartComponent, customUseCartMeta ?? useCartMeta);
}
