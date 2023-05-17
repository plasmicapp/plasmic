import { Checkbox } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import React from "react";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";

export function AntdCheckbox(
  props: Omit<React.ComponentProps<typeof Checkbox>, "onChange"> & {
    onChange?: (checked: boolean) => void;
  }
) {
  const { onChange, ...rest } = props;
  const wrappedOnChange = React.useMemo(() => {
    if (onChange) {
      return (event: CheckboxChangeEvent) => onChange(event.target.checked);
    } else {
      return undefined;
    }
  }, [onChange]);
  return <Checkbox {...rest} onChange={wrappedOnChange} />;
}
AntdCheckbox.__plasmicFormFieldMeta = { valueProp: "checked" };

export const AntdCheckboxGroup = Checkbox.Group;

export const checkboxComponentName = "plasmic-antd5-checkbox";
export const checkboxGroupComponentName = "plasmic-antd5-checkbox-group";

export function registerCheckbox(loader?: Registerable) {
  registerComponentHelper(loader, AntdCheckbox, {
    name: checkboxComponentName,
    displayName: "Checkbox",
    props: {
      checked: {
        type: "boolean",
        editOnly: true,
        uncontrolledProp: "defaultChecked",
        description:
          "Specifies the initial state: whether or not the checkbox is selected",
        defaultValueHint: false,
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      disabled: {
        type: "boolean",
        description: "If checkbox is disabled",
        defaultValueHint: false,
      },
      indeterminate: {
        type: "boolean",
        description: "The indeterminate checked state of checkbox",
        defaultValueHint: false,
      },
      autoFocus: {
        type: "boolean",
        description: "If get focus when component mounted",
        defaultValueHint: false,
        advanced: true,
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Checkbox",
          },
        ],
        ...({ mergeWithParent: true } as any),
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "checked", type: "boolean" }],
      } as any,
    },
    states: {
      checked: {
        type: "writable",
        valueProp: "checked",
        onChangeProp: "onChange",
        variableType: "boolean",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerCheckbox",
    importName: "AntdCheckbox",
  });

  registerComponentHelper(loader, AntdCheckboxGroup, {
    name: checkboxGroupComponentName,
    displayName: "Checkbox Group",
    props: {
      value: {
        type: "choice",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "Default selected value",
        multiSelect: true,
        options: (ps: any) => {
          const options = new Set<string>();
          traverseReactEltTree(ps.children, (elt) => {
            if (
              elt?.type === AntdCheckbox &&
              typeof elt?.props?.value === "string"
            ) {
              options.add(elt.props.value);
            }
          });
          return Array.from(options.keys());
        },
      },
      disabled: {
        type: "boolean",
        description: "Disables all checkboxes",
        defaultValueHint: false,
      },
      children: {
        type: "slot",
        allowedComponents: [checkboxComponentName],
        // Error right now when using default slot content with stateful instances
        // defaultValue: [
        //   {
        //     type: "component",
        //     name: "plasmic-antd5-checkbox",
        //   },
        // ],
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "object" }],
      } as any,
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "boolean",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerCheckbox",
    importName: "AntdCheckboxGroup",
    parentComponentName: checkboxComponentName,
  });
}
