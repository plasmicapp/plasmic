import { AspectRatio, AspectRatioProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const aspectRatioMeta: ComponentMeta<AspectRatioProps> = {
  ...getComponentNameAndImportMeta("AspectRatio"),
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
        name: getPlasmicComponentName("Image"),
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
