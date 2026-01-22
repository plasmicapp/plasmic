import { AspectRatioProps } from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const aspectRatioMeta: CodeComponentMeta<AspectRatioProps> = {
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
