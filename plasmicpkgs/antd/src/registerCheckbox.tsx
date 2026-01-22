import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Checkbox as AntdCheckbox } from "antd";
import type { CheckboxProps } from "antd/es/checkbox/Checkbox";
import type { CheckboxGroupProps } from "antd/es/checkbox/Group";
import React from "react";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

export const Checkbox: typeof AntdCheckbox = AntdCheckbox;
export const CheckboxGroup = Checkbox.Group;

class CheckboxWrapper extends React.Component<CheckboxProps> {
  render() {
    return <Checkbox {...this.props} />;
  }
}

export const checkboxHelpers = {
  states: {
    value: {
      onChangeArgsToValue: (
        e: Parameters<NonNullable<CheckboxProps["onChange"]>>[0]
      ) => e.target.checked,
    },
  },
};

export const checkboxMeta: CodeComponentMeta<CheckboxProps> = {
  name: "AntdCheckbox",
  displayName: "Antd Checkbox",
  props: {
    autoFocus: {
      type: "boolean",
      description: "If get focus when component mounted",
      defaultValueHint: false,
    },
    checked: {
      type: "boolean",
      description:
        "Specifies the initial state: whether or not the checkbox is selected",
      defaultValueHint: false,
    },
    disabled: {
      type: "boolean",
      description: "If disable checkbox",
      defaultValueHint: false,
    },
    indeterminate: {
      type: "boolean",
      description: "The indeterminate checked state of checkbox",
      defaultValueHint: false,
    },
    value: {
      type: "string",
      description: "The checkbox value",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Checkbox",
        },
      ],
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
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
  componentHelpers: {
    helpers: checkboxHelpers,
    importName: "checkboxHelpers",
    importPath: "@plasmicpkgs/antd/skinny/registerCheckbox",
  },
  importPath: "@plasmicpkgs/antd/skinny/registerCheckbox",
  importName: "Checkbox",
  defaultStyles: {
    marginLeft: 0,
  },
};

export function registerCheckbox(
  loader?: Registerable,
  customCheckboxMeta?: CodeComponentMeta<CheckboxProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CheckboxWrapper, customCheckboxMeta ?? checkboxMeta);
}

function getGroupOptions(componentProps: CheckboxGroupProps) {
  const options = new Set<string>();
  traverseReactEltTree(componentProps.children, (elt) => {
    if (
      elt?.type === CheckboxWrapper &&
      typeof elt?.props?.value === "string"
    ) {
      options.add(elt.props.value);
    }
  });
  return Array.from(options.keys());
}

export const checkboxGroupMeta: CodeComponentMeta<CheckboxGroupProps> = {
  name: "AntdCheckboxGroup",
  displayName: "Antd Checkbox Group",
  props: {
    disabled: {
      type: "boolean",
      description: "If disable all checkboxes",
      defaultValueHint: false,
    },
    value: {
      type: "choice",
      editOnly: true,
      description: "Default selected value",
      multiSelect: true,
      options: getGroupOptions,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "value",
          type: {
            type: "choice",
            multiSelect: true,
            options: getGroupOptions,
          },
        },
      ],
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdCheckbox"],
      defaultValue: [
        {
          type: "component",
          name: "AntdCheckbox",
        },
      ],
    },
  },
  states: {
    value: {
      type: "writable",
      variableType: "array",
      valueProp: "value",
      onChangeProp: "onChange",
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerCheckbox",
  importName: "CheckboxGroup",
  parentComponentName: "AntdCheckbox",
};

export function registerCheckboxGroup(
  loader?: Registerable,
  customCheckboxGroupMeta?: CodeComponentMeta<CheckboxGroupProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CheckboxGroup,
    customCheckboxGroupMeta ?? checkboxGroupMeta
  );
}
