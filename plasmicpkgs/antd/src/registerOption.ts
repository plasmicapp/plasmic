import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Select } from "antd";
import type { OptGroupProps } from "rc-select/es/OptGroup";
import type { OptionProps } from "rc-select/es/Option";
import { Registerable } from "./registerable";
export const Option = Select.Option;
export const OptGroup = Select.OptGroup;

export const optionMeta: CodeComponentMeta<OptionProps> = {
  name: "AntdOption",
  displayName: "Antd Option",
  props: {
    disabled: {
      type: "boolean",
      description: "Disable this option",
      defaultValueHint: false,
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
  importPath: "@plasmicpkgs/antd/skinny/registerOption",
  importName: "Option",
  parentComponentName: "AntdSelect",
};

export function registerOption(
  loader?: Registerable,
  customOptionMeta?: CodeComponentMeta<OptionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Option, customOptionMeta ?? optionMeta);
}

export const optGroupMeta: CodeComponentMeta<OptGroupProps> = {
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
  importPath: "@plasmicpkgs/antd/skinny/registerOption",
  importName: "OptGroup",
  parentComponentName: "AntdSelect",
};

export function registerOptGroup(
  loader?: Registerable,
  customOptGroupMeta?: CodeComponentMeta<OptGroupProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(OptGroup, customOptGroupMeta ?? optGroupMeta);
}
