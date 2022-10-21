import { Switch, SwitchProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
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

export function registerSwitch(
  loader?: Registerable,
  customSwitchMeta?: ComponentMeta<SwitchProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Switch, customSwitchMeta ?? switchMeta);
}
