import { TextProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const textMeta: ComponentMeta<TextProps> = {
  ...getComponentNameAndImportMeta("Text"),
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Some Text",
        },
      ],
    },
  },
};
