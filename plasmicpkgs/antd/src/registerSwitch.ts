import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Switch as AntdSwitch } from "antd";
import type { SwitchProps } from "antd/es/switch";
import { Registerable } from "./registerable";
export const Switch: typeof AntdSwitch = AntdSwitch;

export const switchMeta: CodeComponentMeta<SwitchProps> = {
  name: "AntdSwitch",
  displayName: "Antd Switch",
  props: {
    autoFocus: {
      type: "boolean",
      description: "Whether get focus when component mounted",
      defaultValueHint: false,
    },
    checked: {
      type: "boolean",
      description: "Whether to set the initial state",
      defaultValueHint: false,
    },
    disabled: {
      type: "boolean",
      description: "Disable switch",
      defaultValueHint: false,
    },
    loading: {
      type: "boolean",
      description: "Loading state of switch",
      defaultValueHint: false,
    },
    checkedChildren: {
      type: "slot",
      defaultValue: [],
      hidePlaceholder: true,
    },
    unCheckedChildren: {
      type: "slot",
      defaultValue: [],
      hidePlaceholder: true,
    },
    size: {
      type: "choice",
      options: ["small", "default"],
      description: "The size of the Switch",
      defaultValueHint: "default",
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "checked",
          type: "boolean",
        },
        {
          name: "event",
          type: "object",
        },
      ],
    },
  },
  states: {
    value: {
      type: "writable",
      variableType: "boolean",
      onChangeProp: "onChange",
      valueProp: "checked",
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerSwitch",
  importName: "Switch",
};

export function registerSwitch(
  loader?: Registerable,
  customSwitchMeta?: CodeComponentMeta<SwitchProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Switch, customSwitchMeta ?? switchMeta);
}
