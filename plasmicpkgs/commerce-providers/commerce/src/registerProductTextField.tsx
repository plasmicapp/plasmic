import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { useProduct } from "./contexts";

interface ProductTextFieldProps {
  className: string;
  field: string;
}

export const productTextFieldMeta: ComponentMeta<ProductTextFieldProps> = {
  name: "plasmic-commerce-product-text-field",
  displayName: "Product Text Field",
  props: {
    field: {
      type: "choice",
      options: ["id", "name", "description", "sku", "slug", "path"]
    }
  },
  importPath: "commerce-providers/commerce",
  importName: "ProductTextField",
};

export function ProductTextField(props: ProductTextFieldProps) {
  const { className, field } = props;

  const product = useProduct();

  if (!product) {
    return <span className={className}>Fake Product Field</span>
  }
  if (!field) {
    return <span className={className}>Unknown Product Field</span>
  }

  let value;
  if (field === "description") {
    return product.descriptionHtml
      ? <div className={className} dangerouslySetInnerHTML={{__html: product.descriptionHtml}} />
      : <div className={className}>{product.description}</div>
  } else {
    value = (product as any)[field];
  }
  return <span className={className}>{value}</span>
}

export function registerTextField(
  loader?: Registerable,
  customProductTextFieldMeta?: ComponentMeta<ProductTextFieldProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductTextField, customProductTextFieldMeta ?? productTextFieldMeta);
}
