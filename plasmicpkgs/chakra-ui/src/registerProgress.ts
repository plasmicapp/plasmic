import { ProgressProps } from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const progressMeta: CodeComponentMeta<ProgressProps> = {
  ...getComponentNameAndImportMeta("Progress"),
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
      defaultValue: "blue",
    },
    size: {
      type: "choice",
      options: ["xs", "sm", "md", "lg"],
      defaultValue: "md",
    },
    max: {
      type: "number",
      defaultValue: 100,
    },
    min: {
      type: "number",
      defaultValue: 0,
    },
    value: "number",

    isIndeterminate: {
      type: "boolean",
    },
    hasStripe: {
      type: "boolean",
    },
    isAnimated: {
      type: "boolean",
      hidden: (props) => !props.hasStripe,
    },
  },
};
