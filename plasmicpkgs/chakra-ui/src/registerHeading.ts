import { Heading, HeadingProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";

export const headingMeta: ComponentMeta<HeadingProps> = {
  name: "Heading",
  importPath: "@chakra-ui/react",
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

export function registerHeading(
  loader?: Registerable,
  customHeadingMeta?: ComponentMeta<HeadingProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Heading, customHeadingMeta ?? headingMeta);
}
