import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Code, CodeProps } from "@chakra-ui/react";
import { Registerable } from "./registerable";

export const codeMeta: ComponentMeta<CodeProps> = {
  name: "Code",
  importPath: "@chakra-ui/react",
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

export function registerCode(
  loader?: Registerable,
  customCodeMeta?: ComponentMeta<CodeProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Code, customCodeMeta ?? codeMeta);
}
