import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { useProduct, useProductForm } from "./contexts";
import { useFormContext, Controller } from "react-hook-form";

interface ProductVariantPickerProps {
  className: string;
}

export const productVariantPickerMeta: ComponentMeta<ProductVariantPickerProps> = {
  name: "plasmic-commerce-product-variant-picker",
  displayName: "Product Variant Picker",
  props: { },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductVariantPicker",
};

export function ProductVariantPicker(props: ProductVariantPickerProps) {
  const { className } = props;

  const product = useProduct();
  const form = useFormContext();

  return (
    <Controller
      name={"ProductVariant"}
      control={form?.control}
      defaultValue={product?.variants[0].id}
      render={({field}) =>
        <select
          className={className}
          {...field}
        >
          {product?.variants.map(variant =>
            <option value={variant.id}>
              {variant.name}
            </option>
          ) ?? <option>Fake Product Variant</option>}
        </select>
      }
    />
  )
}

export function registerProductVariantPicker(
  loader?: Registerable,
  customProductVariantPickerMeta?: ComponentMeta<ProductVariantPickerProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductVariantPicker, customProductVariantPickerMeta ?? productVariantPickerMeta);
}
