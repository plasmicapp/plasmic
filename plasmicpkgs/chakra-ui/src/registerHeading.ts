import { HeadingProps } from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const headingMeta: CodeComponentMeta<HeadingProps> = {
  ...getComponentNameAndImportMeta("Heading"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value:
          "Basic text writing, including headings, body text, lists, and more.",
      },
    },
    size: {
      type: "choice",
      options: ["4xl", "3xl", "2xl", "xl", "lg", "md", "sm", "xs"],
      defaultValue: "xl",
    },
    noOfLines: {
      type: "number",
      defaultValue: 1,
    },
  },
};
