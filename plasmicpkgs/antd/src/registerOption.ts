import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { OptGroup, Option } from "rc-select";
import { OptGroupProps } from "rc-select/lib/OptGroup";
import { OptionProps } from "rc-select/lib/Option";
import { Registerable } from "./registerable";

export const optionMeta: ComponentMeta<OptionProps> = {
  name: "AntdOption",
  displayName: "Antd Option",
  props: {
    disabled: {
      type: "boolean",
      description: "Disable this option",
    },
    title: {
      type: "string",
      description: "title of Select after select this Option",
    },
    value: {
      type: "string",
      description: "Default to filter with this property",
    },
    key: {
      type: "string",
      description: "Option key",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Option",
        },
      ],
    },
  },
  importPath: "rc-select",
  importName: "Option",
};

export function registerOption(
  loader?: Registerable,
  customOptionMeta?: ComponentMeta<OptionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Option, customOptionMeta ?? optionMeta);
}

export const optGroupMeta: ComponentMeta<OptGroupProps> = {
  name: "AntdOptionGroup",
  displayName: "Antd Option Group",
  props: {
    key: {
      type: "string",
      description: "Group key",
    },
    label: {
      type: "string",
      description: "Group label",
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdOption"],
      defaultValue: [
        {
          type: "component",
          name: "AntdOption",
        },
      ],
    },
  },
  importPath: "rc-select",
  importName: "OptGroup",
};

export function registerOptGroup(
  loader?: Registerable,
  customOptGroupMeta?: ComponentMeta<OptGroupProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(OptGroup, customOptGroupMeta ?? optGroupMeta);
}
