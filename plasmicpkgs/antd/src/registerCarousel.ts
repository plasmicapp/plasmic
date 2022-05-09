import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import Carousel, { CarouselProps } from "antd/lib/carousel";
import { CSSProperties } from "react";
import { Registerable } from "./registerable";

const contentStyle: CSSProperties = {
  height: "160px",
  color: "#fff",
  lineHeight: "160px",
  textAlign: "center",
  backgroundColor: "#364d79",
};

export const carouselMeta: ComponentMeta<CarouselProps> = {
  name: "AntdCarousel",
  displayName: "Antd Carousel",
  props: {
    autoplay: {
      type: "boolean",
      description: "Whether to scroll automatically",
      defaultValueHint: false,
    },
    dotPosition: {
      type: "choice",
      options: ["top", "bottom", "left", "right"],
      description: "The position of the dots",
      defaultValueHint: "bottom",
    },
    dots: {
      type: "boolean",
      description: "Whether to show the dots at the bottom of the gallery",
      defaultValueHint: true,
    },
    effect: {
      type: "choice",
      options: ["scrollx", "fade"],
      defaultValueHint: "scrollx",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "vbox",
          children: {
            type: "text",
            value: "1",
            styles: contentStyle,
          },
        },
        {
          type: "vbox",
          children: {
            type: "text",
            value: "2",
            styles: contentStyle,
          },
        },
      ],
    },
  },
  importPath: "antd/lib/carousel",
  importName: "Carousel",
  isDefaultExport: true,
};

export function registerCarousel(
  loader?: Registerable,
  customCarouselMeta?: ComponentMeta<CarouselProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Carousel, customCarouselMeta ?? carouselMeta);
}
