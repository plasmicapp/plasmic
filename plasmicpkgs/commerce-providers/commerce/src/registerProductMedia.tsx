import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useProduct, useProductSliderContext } from "./contexts";
import { Registerable } from "./registerable";

const placeholderImage =
  "https://static1.plasmic.app/commerce/lightweight-jacket-0.png";

interface ProductMediaProps {
  className: string;
  mediaIndex?: number;
  mediaSize?: string;
}

export const productMediaMeta: ComponentMeta<ProductMediaProps> = {
  name: "plasmic-commerce-product-media",
  displayName: "Product Media",
  props: {
    mediaIndex: "number",
    mediaSize: {
      type: "choice",
      options: [
        { label: "Fill", value: "fill" },
        { label: "Container", value: "contain" },
        { label: "Cover", value: "cover" },
        { label: "None", value: "none" },
        { label: "Scale down", value: "scale-down" },
      ],
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductMedia",
};

export function ProductMedia(props: ProductMediaProps) {
  const { className, mediaIndex = 0, mediaSize } = props;

  const product = useProduct();
  const sliderContext = useProductSliderContext();

  const image = product?.images[sliderContext ?? mediaIndex];
  return (
    <img
      alt={product?.name || "Product Image"}
      src={product ? image?.url ?? "" : placeholderImage}
      loading={"lazy"}
      className={className}
      style={{
        objectFit: mediaSize as any,
      }}
    />
  );
}

export function registerProductMedia(
  loader?: Registerable,
  customProductMediaMeta?: ComponentMeta<ProductMediaProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductMedia, customProductMediaMeta ?? productMediaMeta);
}
