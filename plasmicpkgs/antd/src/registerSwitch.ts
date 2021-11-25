import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import { Switch, SwitchProps } from "antd";
import { Registerable } from "./registerable";

export const switchMeta: ComponentMeta<SwitchProps> = {
  name: "Antd Switch",
  props: {
    autoFocus: {
      type: "boolean",
      description: "Whether get focus when component mounted",
    },
    checked: {
      type: "boolean",
      editOnly: true,
      uncontrolledProp: "defaultChecked",
      description: "Whether to set the initial state",
    },
    disabled: {
      type: "boolean",
      description: "Disable switch",
    },
    loading: {
      type: "boolean",
      description: "Loading state of switch",
    },
    checkedChildren: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "1",
        },
      ],
    },
    unCheckedChildren: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "0",
        },
      ],
    },
    size: {
      type: "choice",
      options: ["small", "default"],
      description: "The size of the Switch",
    },
  },
  importPath: "antd",
  importName: "Switch",
};

export function registerSwitch(
  loader?: Registerable,
  customSwitchMeta?: ComponentMeta<SwitchProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Switch, customSwitchMeta ?? switchMeta);
}
