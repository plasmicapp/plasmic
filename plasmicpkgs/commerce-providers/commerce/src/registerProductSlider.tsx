import { repeatedElement } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { ProductMediaProvider, useProduct } from "./contexts";
import { Registerable } from "./registerable";

interface ProductSliderProps {
  className: string;
  slideContainer?: React.ReactNode;
  thumbsContainer?: React.ReactNode;
  thumbsVisible?: number;
  slideSelected?: number;
}

export const productSliderMeta: CodeComponentMeta<ProductSliderProps> = {
  name: "plasmic-commerce-product-slider",
  displayName: "Product Slider",
  providesData: true,
  props: {
    thumbsVisible: {
      type: "number",
      description: "Number of thumbs visible",
      defaultValue: 4,
      defaultValueHint: 4,
    },
    slideContainer: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "plasmic-commerce-product-media",
          },
        ],
      },
    },
    thumbsContainer: {
      type: "slot",
      defaultValue: {
        type: "hbox",
        children: [
          {
            type: "component",
            name: "plasmic-commerce-product-media",
          },
        ],
      },
    },
    slideSelected: {
      type: "number",
      defaultValue: 0,
      defaultValueHint: 0,
      description: "Current slide selected",
    },
  },
  importPath: "@plasmicpkgs/commerce",
  importName: "ProductSlider",
};

export function ProductSlider(props: ProductSliderProps) {
  const {
    className,
    slideContainer,
    thumbsContainer,
    thumbsVisible = 4,
    slideSelected = 0,
  } = props;

  const product = useProduct();

  const [selected, setSelected] = React.useState<number>(slideSelected);

  const maximumLeft = Math.max(0, product.images.length - thumbsVisible);
  const leftIndex = Math.min(maximumLeft, Math.max(0, selected - 1));
  return (
    <div className={className}>
      {<ProductMediaProvider mediaIndex={selected} children={slideContainer} />}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${thumbsVisible}, 1fr)`,
        }}
      >
        {product.images
          .slice(leftIndex, leftIndex + thumbsVisible)
          .map((image, i) =>
            repeatedElement(
              i,
              <ProductMediaProvider
                mediaIndex={leftIndex + i}
                children={thumbsContainer}
                onClick={() => setSelected(leftIndex + i)}
              />
            )
          )}
      </div>
    </div>
  );
}

export function registerProductSlider(
  loader?: Registerable,
  customProductSliderMeta?: CodeComponentMeta<ProductSliderProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    ProductSlider,
    customProductSliderMeta ?? productSliderMeta
  );
}
