import { CodeProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const codeMeta: ComponentMeta<CodeProps> = {
  ...getComponentNameAndImportMeta("Code"),
  props: {
    colorScheme: {
      type: "choice",
      options: [
        "whiteAlpha",
        "blackAlpha",
        "gray",
        "red",
        "orange",
        "yellow",
        "green",
        "teal",
        "blue",
        "cyan",
        "purple",
        "pink",
        "linkedin",
        "facebook",
        "messenger",
        "whatsapp",
        "twitter",
        "telegram",
      ],
      defaultValue: "gray",
    },
    variant: {
      type: "choice",
      options: ["solid", "subtle", "outline"],
      defaultValue: "subtle",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Code",
        },
      ],
    },
  },
};
