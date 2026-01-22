import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useFormContext } from "react-hook-form";
import useAddItem from "./cart/use-add-item";
import { useProduct } from "./contexts";
import { Registerable } from "./registerable";
import { CommerceError } from "./utils/errors";

interface AddToCartButtonProps {
  children?: React.ReactNode;
}

export const addToCartButtonMeta: CodeComponentMeta<AddToCartButtonProps> = {
  name: "plasmic-commerce-add-to-cart-button",
  displayName: "Add To Cart Button",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "button",
          value: "Add To Cart",
        },
      ],
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "AddToCartButton",
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const { children } = props;

  const product = useProduct();
  const form = useFormContext();
  const addItem = useAddItem();

  const addToCart = async () => {
    const quantity = +(form.getValues()["ProductQuantity"] ?? 1);
    if (isNaN(quantity) || quantity < 1) {
      throw new CommerceError({
        message: "The item quantity has to be a valid integer greater than 0",
      });
    }
    if (product) {
      const variantId =
        form.getValues()["ProductVariant"] ?? product.variants[0].id;
      await addItem({
        productId: product.id,
        variantId: variantId,
        quantity: quantity,
      });
    }
  };

  return React.isValidElement(children)
    ? React.cloneElement(children, {
        onClick: (e: MouseEvent) => {
          if (
            children.props.onClick &&
            typeof children.props.onClick === "function"
          ) {
            children.props.onClick(e);
          }
          addToCart();
        },
      } as Partial<unknown> & React.Attributes)
    : null;
}

export function registerAddToCartButton(
  loader?: Registerable,
  customAddToCartButtonMeta?: CodeComponentMeta<AddToCartButtonProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    AddToCartButton,
    customAddToCartButtonMeta ?? addToCartButtonMeta
  );
}
