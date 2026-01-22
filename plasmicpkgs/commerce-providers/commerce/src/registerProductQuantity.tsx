import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Registerable } from "./registerable";

interface ProductQuantityProps {
  className: string;
  children?: React.ReactNode;
}

export const productQuantityMeta: CodeComponentMeta<ProductQuantityProps> = {
  name: "plasmic-commerce-product-quantity",
  displayName: "Product Quantity",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "input",
          attrs: {
            value: "1",
          },
        },
      ],
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductQuantity",
};

export function ProductQuantity(props: ProductQuantityProps) {
  const { className, children } = props;

  const form = useFormContext();

  return (
    <div className={className}>
      <Controller
        name={"ProductQuantity"}
        defaultValue={1}
        control={form?.control}
        render={({ field }) =>
          React.isValidElement(children) ? (
            React.cloneElement(children, {
              ...children.props,
              ...field,
              name: "ProductQuantity",
            })
          ) : (
            <></>
          )
        }
      />
    </div>
  );
}

export function registerProductQuantity(
  loader?: Registerable,
  customProductQuantityMeta?: CodeComponentMeta<ProductQuantityProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductQuantity,
    customProductQuantityMeta ?? productQuantityMeta
  );
}
