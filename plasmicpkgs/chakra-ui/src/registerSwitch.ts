import { SwitchProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const switchMeta: ComponentMeta<SwitchProps> = {
  ...getComponentNameAndImportMeta("Switch"),
  props: {
    isChecked: "boolean",
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
      defaultValue: "blue",
    },
    size: {
      type: "choice",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    spacing: {
      type: "string",
      defaultValue: "0.5rem",
    },
    id: "string",
    isDisabled: "boolean",
    isInvalid: "boolean",
    isReadOnly: "boolean",
    isRequired: "boolean",
  },
};
