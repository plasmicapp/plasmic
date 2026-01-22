import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { useProduct, useProductMediaContext } from "./contexts";
import { Registerable } from "./registerable";

const placeholderImage =
  "https://static1.plasmic.app/commerce/lightweight-jacket-0.png";

interface ProductMediaProps {
  className: string;
  mediaIndex?: number;
  setControlContextData: (data: { inMediaContext: boolean }) => void;
}

export const productMediaMeta: CodeComponentMeta<ProductMediaProps> = {
  name: "plasmic-commerce-product-media",
  displayName: "Product Media",
  props: {
    mediaIndex: {
      type: "number",
      min: 0,
      hidden: (_, ctx) => !!ctx?.inMediaContext,
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductMedia",
};

export const ProductMedia = React.forwardRef(
  (props: ProductMediaProps, ref: React.ForwardedRef<HTMLImageElement>) => {
    const { className, mediaIndex = 0, setControlContextData } = props;

    const product = useProduct();
    const mediaContext = useProductMediaContext();

    setControlContextData?.({
      inMediaContext: mediaContext !== undefined,
    });

    const image = product?.images[mediaContext ?? mediaIndex];
    return (
      <img
        ref={ref}
        alt={product?.name || "Product Image"}
        src={product ? image?.url ?? "" : placeholderImage}
        loading={"lazy"}
        className={className}
      />
    );
  }
);

export function registerProductMedia(
  loader?: Registerable,
  customProductMediaMeta?: CodeComponentMeta<ProductMediaProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ProductMedia, customProductMediaMeta ?? productMediaMeta);
}
