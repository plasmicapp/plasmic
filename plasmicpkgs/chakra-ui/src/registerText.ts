import { TextProps } from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const textMeta: CodeComponentMeta<TextProps> = {
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
