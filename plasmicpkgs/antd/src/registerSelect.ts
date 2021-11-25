import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import { Select } from "antd";
import { SelectProps } from "rc-select";
import { Registerable } from "./registerable";

export const selectMeta: ComponentMeta<SelectProps> = {
  name: "Antd Select",
  props: {
    autoFocus: {
      type: "boolean",
      description: "Get focus by default",
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
    },
    disabled: {
      type: "boolean",
      description: "Whether disabled select",
    },
    listHeight: {
      type: "number",
      description: "Config popup height",
    },
    loading: {
      type: "boolean",
      description: "Indicate loading state",
    },
    mode: {
      type: "choice",
      options: ["multiple", "tags"],
      description: "Set mode of Select",
    },
    open: {
      type: "boolean",
      editOnly: true,
      uncontrolledProp: "defaultOpen",
      description: "Initial open state of dropdown",
    },
    placeholder: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Select",
        },
      ],
    },
    showArrow: {
      type: "boolean",
      description: "Whether to show the drop-down arrow",
    },
    showSearch: {
      type: "boolean",
      description: "Whether show search input in single mode",
    },
    size: {
      type: "choice",
      options: ["large", "middle", "small"],
      description: "Set mode of Select",
    },
    value: {
      type: "object",
      editOnly: true,
      uncontrolledProp: "defaultValue",
      description: "Initial selected option",
    },
    virtual: {
      type: "boolean",
      description: "Disable virtual scroll when set to false",
    },
    children: {
      type: "slot",
      allowedComponents: ["Option"],
      defaultValue: [
        {
          type: "component",
          name: "Antd Option",
          props: {
            value: "Option",
            children: {
              type: "text",
              value: "Option",
            },
          },
        },
      ],
    },
  },
  importPath: "antd",
  importName: "Select",
};

export function registerSelect(
  loader?: Registerable,
  customSelectMeta?: ComponentMeta<SelectProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Select, customSelectMeta ?? selectMeta);
}
