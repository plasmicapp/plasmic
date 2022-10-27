import { AspectRatioProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
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
