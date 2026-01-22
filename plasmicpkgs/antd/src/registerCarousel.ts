import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Carousel as AntdCarousel } from "antd";
import type { CarouselProps } from "antd/es/carousel";
import { Registerable } from "./registerable";

export const Carousel = AntdCarousel;

const contentStyle = {
  height: 160,
  color: "#fff",
  lineHeight: 160,
  textAlign: "center" as const,
  backgroundColor: "#364d79",
};

export const carouselMeta: CodeComponentMeta<CarouselProps> = {
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
  importPath: "@plasmicpkgs/antd/skinny/registerCarousel",
  importName: "Carousel",
};

export function registerCarousel(
  loader?: Registerable,
  customCarouselMeta?: CodeComponentMeta<CarouselProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Carousel, customCarouselMeta ?? carouselMeta);
}
