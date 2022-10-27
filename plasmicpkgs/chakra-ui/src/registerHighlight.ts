import { HighlightProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const highlightMeta: ComponentMeta<HighlightProps> = {
  ...getComponentNameAndImportMeta("Highlight"),
  props: {
    children: {
      displayName: "text",
      type: "string",
      defaultValue: "With the Highlight component, you can spotlight words.",
    },
    query: {
      type: "array",
      defaultValue: ["Spotlight", "words"],
    },
    styles: {
      type: "object",
      defaultValue: {
        backgroundColor: "orange.100",
        px: "0.3em",
        py: "0.1em",
        borderRadius: "0.3em",
      },
    },
  },
};
