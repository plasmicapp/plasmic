import { Text, TextProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";

export const textMeta: ComponentMeta<TextProps> = {
  name: "Text",
  importPath: "@chakra-ui/react",
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

export function registerText(
  loader?: Registerable,
  customTextMeta?: ComponentMeta<TextProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Text, customTextMeta ?? textMeta);
}
