import { repeatedElement } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { ProductMediaProvider, useProduct } from "./contexts";
import { Registerable } from "./registerable";

const placeholderImage =
  "https://static1.plasmic.app/commerce/lightweight-jacket-0.png";

interface ProductMediaCollectionProps {
  className: string;
  media: React.ReactNode;
}

export const productMediaCollectionMeta: ComponentMeta<ProductMediaCollectionProps> = {
  name: "plasmic-commerce-product-media-collection",
  displayName: "Product Media Collection",
  props: {
    media: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "plasmic-commerce-product-media",
      },
      allowedComponents: ["plasmic-commerce-product-media"],
    },
  },
  defaultStyles: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridRowGap: "8px",
    gridColumnGap: "8px",
    padding: "8px",
    maxWidth: "100%",
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductMediaCollection",
};

export function ProductMediaCollection(props: ProductMediaCollectionProps) {
  const { media, className } = props;

  const product = useProduct();
  return (
    <div className={className}>
      {product?.images.map((image, i) =>
        repeatedElement(
          i === 0,
          <ProductMediaProvider mediaIndex={i} children={media} />
        )
      )}
    </div>
  );
}

export function registerProductMediaCollection(
  loader?: Registerable,
  customProductMediaCollectionMeta?: ComponentMeta<ProductMediaCollectionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductMediaCollection,
    customProductMediaCollectionMeta ?? productMediaCollectionMeta
  );
}
