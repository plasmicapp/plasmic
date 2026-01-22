import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Select as AntdSelect } from "antd";
import React from "react";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

export const Select = AntdSelect;
const Option = Select.Option;

type SelectProps = React.ComponentProps<typeof Select>;

export const selectMeta: CodeComponentMeta<SelectProps> = {
  name: "AntdSelect",
  displayName: "Antd Select",
  props: {
    allowClear: {
      type: "boolean",
      description: "Show clear button",
      defaultValueHint: false,
    },
    autoClearSearchValue: {
      type: "boolean",
      description:
        "Whether the current search will be cleared on selecting an item",
      defaultValueHint: true,
      hidden: (props) => props.mode !== "multiple" && props.mode !== "tags",
    },
    autoFocus: {
      type: "boolean",
      description: "Get focus by default",
      defaultValueHint: false,
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
      defaultValueHint: true,
    },
    disabled: {
      type: "boolean",
      description: "Whether disabled select",
      defaultValueHint: false,
    },
    listHeight: {
      type: "number",
      description: "Config popup height",
      defaultValueHint: 256,
    },
    loading: {
      type: "boolean",
      description: "Indicate loading state",
      defaultValueHint: false,
    },
    mode: {
      type: "choice",
      options: ["multiple", "tags"],
      description: "Set mode of Select",
    },
    open: {
      type: "boolean",
      editOnly: true,
      description: "Initial open state of dropdown",
      defaultValueHint: false,
    },
    onDropdownVisibleChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "open",
          type: "boolean",
        },
      ],
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
      defaultValueHint: true,
    },
    showSearch: {
      type: "boolean",
      description: "Whether show search input in single mode",
      defaultValueHint: false,
    },
    size: {
      type: "choice",
      options: ["large", "middle", "small"],
      description: "Set mode of Select",
      defaultValueHint: "middle",
    },
    value: {
      type: "choice",
      description: "Initial selected option",
      options: (componentProps) => {
        const options = new Set<string>();
        traverseReactEltTree(componentProps.children, (elt) => {
          if (elt?.type === Option && typeof elt?.props?.value === "string") {
            options.add(elt.props.value);
          }
        });
        return Array.from(options.keys());
      },
    },
    virtual: {
      type: "boolean",
      description: "Disable virtual scroll when set to false",
      defaultValueHint: true,
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdOption, AntdOptionGroup"],
      defaultValue: [
        {
          type: "component",
          name: "AntdOption",
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
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "value",
          type: "string",
        },
        {
          name: "option",
          type: "object",
        },
      ],
    },
  },
  states: {
    value: {
      type: "writable",
      variableType: "text",
      onChangeProp: "onChange",
      valueProp: "value",
    },
    open: {
      type: "writable",
      variableType: "boolean",
      onChangeProp: "onDropdownVisibleChange",
      valueProp: "open",
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerSelect",
  importName: "Select",
};

export function registerSelect(
  loader?: Registerable,
  customSelectMeta?: CodeComponentMeta<SelectProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Select, customSelectMeta ?? selectMeta);
}
