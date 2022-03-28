import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import React from "react";
import { repeatedElement } from "@plasmicapp/host";
import { ProductProvider } from "./contexts";
import useSearch from "./product/use-search";
import { Product } from "./types/product";

interface ProductCollectionProps {
  className?: string;
  children?: React.ReactNode;
  count?: number;
  categoryId?: string;
  brandId?: string;
}

export const productCollectionMeta: ComponentMeta<ProductCollectionProps> = {
  name: "plasmic-commerce-product-collection",
  displayName: "Product Collection",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "vbox",
          children: [
            {
              type: "component",
              name: "plasmic-commerce-product-text-field",
              props: {
                field: "name"
              }
            },
            {
              type: "component",
              name: "plasmic-commerce-product-media"
            }
          ],
          styles: {
            width: "100%"
          }
        },
      ]
    },
    count: "number",
    categoryId: "string",
    brandId: "string",
  },
  defaultStyles: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
  },
  importPath: "commerce-providers/commerce",
  importName: "ProductCollection",
};

function ProductCollection(props: ProductCollectionProps) {
  const { className, children, count, categoryId, brandId } = props;

  const { data } = useSearch({
    categoryId,
    brandId,
    count
  });

  return (
    <div className={className}>
    {data?.products.map((product: Product, i: number) =>
      <ProductProvider product={product} key={product.id}>
        {repeatedElement(i === 0, children)}
      </ProductProvider>
    )}
    </div>
  )
}

export function registerProductCollection(
  loader?: Registerable,
  customProductCollectionMeta?: ComponentMeta<ProductCollectionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductCollection, customProductCollectionMeta ?? productCollectionMeta);
}
