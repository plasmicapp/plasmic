import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useProduct } from "./contexts";
import usePrice from "./product/use-price";
import { Registerable } from "./registerable";
import { getProductPrice } from "./utils/get-product-price";

interface ProductPriceProps {
  className: string;
}

export const productPriceMeta: ComponentMeta<ProductPriceProps> = {
  name: "plasmic-commerce-product-price",
  displayName: "Product Price",
  props: {},
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductPriceComponent",
};

export function ProductPriceComponent(props: ProductPriceProps) {
  const { className } = props;

  const product = useProduct();
  const form = useFormContext();

  const watchProductVariant = form?.watch(
    "ProductVariant",
    product.price ?? ""
  );

  const { price } = usePrice({
    amount: product ? getProductPrice(product, watchProductVariant) : 0,
    currencyCode: product ? product.price.currencyCode! : "USD",
  });

  return <span className={className}>{price}</span>;
}

export function registerProductPrice(
  loader?: Registerable,
  customProductPriceMeta?: ComponentMeta<ProductPriceProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductPriceComponent,
    customProductPriceMeta ?? productPriceMeta
  );
}
