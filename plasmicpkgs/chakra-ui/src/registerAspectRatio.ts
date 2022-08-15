import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { AspectRatio, AspectRatioProps } from "@chakra-ui/react";
import { Registerable } from "./registerable";

export const aspectRatioMeta: ComponentMeta<AspectRatioProps> = {
  name: "AspectRatio",
  importPath: "@chakra-ui/react",
  defaultStyles: {
    width: "320px",
  },
  props: {
    ratio: {
      type: "number",
      defaultValue: 1.333,
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "Image",
      },
    },
  },
};

export function registerAspectRatio(
  loader?: Registerable,
  customAspectRatioMeta?: ComponentMeta<AspectRatioProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(AspectRatio, customAspectRatioMeta ?? aspectRatioMeta);
}
