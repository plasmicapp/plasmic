import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import { OptGroupProps } from "rc-select/lib/OptGroup";
import Select, { OptionProps } from "antd/lib/select";
import { Registerable } from "./registerable";

const { Option, OptGroup } = Select;

export const optionMeta: ComponentMeta<OptionProps> = {
  name: "Antd Option",
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
  importPath: "antd/lib/select",
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
  name: "Antd Option Group",
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
      allowedComponents: ["Option"],
      defaultValue: [
        {
          type: "component",
          name: "Antd Option",
        },
      ],
    },
  },
  importPath: "antd/lib/select",
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
