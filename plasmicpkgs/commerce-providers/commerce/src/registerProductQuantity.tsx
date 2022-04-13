import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { useProduct, useProductForm } from "./contexts";
import { useFormContext, Controller } from "react-hook-form";

interface ProductQuantityProps {
  className: string;
  children?: React.ReactNode;
}

export const productQuantityMeta: ComponentMeta<ProductQuantityProps> = {
  name: "plasmic-commerce-product-quantity",
  displayName: "Product Quantity",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "input",
          attrs: {
            value: "1"
          }
        }
      ]
    }
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
        render={({field}) =>
          React.isValidElement(children)
            ? React.cloneElement(children, { ...children.props, ...field, name: "ProductQuantity"})
            : <></>
        }
      />
    </div>
  )
}

export function registerProductQuantity(
  loader?: Registerable,
  customProductQuantityMeta?: ComponentMeta<ProductQuantityProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductQuantity, customProductQuantityMeta ?? productQuantityMeta);
}
