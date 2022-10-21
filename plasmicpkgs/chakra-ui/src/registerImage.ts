import { Image, ImageProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import { getComponentNameAndImportMeta } from "./utils";

export const imageMeta: ComponentMeta<ImageProps> = {
  ...getComponentNameAndImportMeta("Image"),
  props: {
    src: {
      type: "string",
      defaultValue: "https://bit.ly/naruto-sage",
    },
    fallbackSrc: {
      type: "string",
      defaultValue: "https://via.placeholder.com/150",
    },
    alt: {
      type: "string",
      defaultValueHint: "name of the image",
    },
    loading: {
      type: "choice",
      options: ["lazy", "eager"],
    },
  },
};

export function registerImage(
  loader?: Registerable,
  customImageMeta?: ComponentMeta<ImageProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Image, customImageMeta ?? imageMeta);
}
