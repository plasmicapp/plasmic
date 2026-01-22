import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { useProduct } from "./contexts";
import { Registerable } from "./registerable";

interface ProductVariantPickerProps {
  className: string;
}

export const productVariantPickerMeta: CodeComponentMeta<ProductVariantPickerProps> =
  {
    name: "plasmic-commerce-product-variant-picker",
    displayName: "Product Variant Picker",
    props: {},
    importPath: "@plasmicpkgs/commerce",
    importName: "ProductVariantPicker",
  };

export function ProductVariantPicker(props: ProductVariantPickerProps) {
  const { className } = props;

  const product = useProduct();
  const form = useFormContext() ?? useForm();

  return (
    <Controller
      name={"ProductVariant"}
      control={form?.control}
      defaultValue={
        product?.variants.find((v) => v.price === product.price.value)?.id
      }
      render={({ field }) => (
        <select className={className} {...field}>
          {product?.variants.map((variant) => (
            <option value={variant.id}>{variant.name}</option>
          )) ?? <option>Product Variant Placeholder</option>}
        </select>
      )}
    />
  );
}

export function registerProductVariantPicker(
  loader?: Registerable,
  customProductVariantPickerMeta?: CodeComponentMeta<ProductVariantPickerProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductVariantPicker,
    customProductVariantPickerMeta ?? productVariantPickerMeta
  );
}
