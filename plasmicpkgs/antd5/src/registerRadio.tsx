import { Radio } from "antd";
import type { RadioChangeEvent } from "antd/es/radio";
import React from "react";
import {
  radioButtonComponentName,
  radioComponentName,
  radioGroupComponentName,
} from "./names";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";
const RadioGroup = Radio.Group;

export const AntdRadio = Radio;
export const AntdRadioButton = Radio.Button;
export function AntdRadioGroup(
  props: Omit<React.ComponentProps<typeof RadioGroup>, "onChange"> & {
    onChange?: (value?: string) => void;
    useChildren?: boolean;
  }
) {
  const { onChange, useChildren, ...rest } = props;
  const wrappedOnChange = React.useMemo(() => {
    if (onChange) {
      return (event: RadioChangeEvent) => onChange(event.target.value);
    } else {
      return undefined;
    }
  }, [onChange]);
  return (
    <RadioGroup
      {...rest}
      onChange={wrappedOnChange}
      options={useChildren ? undefined : rest.options}
    />
  );
}

export function registerRadio(loader?: Registerable) {
  registerComponentHelper(loader, AntdRadio, {
    name: radioComponentName,
    displayName: "Radio",
    props: {
      value: {
        type: "string",
        description: "The radio option value",
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
      },
      autoFocus: {
        type: "boolean",
        description: "If focused when first shown",
        defaultValueHint: false,
        advanced: true,
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Radio",
          },
        ],
        ...({ mergeWithParent: true } as any),
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerRadio",
    importName: "AntdRadio",
    parentComponentName: radioGroupComponentName,
  });
  registerComponentHelper(loader, AntdRadioButton, {
    name: radioButtonComponentName,
    displayName: "Radio Button",
    props: {
      value: {
        type: "string",
        description: "The radio option value",
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
      },
      autoFocus: {
        type: "boolean",
        description: "If focused when first shown",
        defaultValueHint: false,
        advanced: true,
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Radio",
          },
        ],
        ...({ mergeWithParent: true } as any),
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerRadio",
    importName: "AntdRadioButton",
    parentComponentName: radioGroupComponentName,
  });

  registerComponentHelper(loader, AntdRadioGroup, {
    name: radioGroupComponentName,
    displayName: "Radio Group",
    props: {
      options: {
        type: "array",
        hidden: (ps) => !!ps.useChildren,
        itemType: {
          type: "object",
          nameFunc: (item: any) => item.label || item.value,
          fields: {
            value: "string",
            label: "string",
          },
        },
        defaultValue: [
          {
            value: "option1",
            label: "Option 1",
          },
          {
            value: "option2",
            label: "Option 2",
          },
        ],
      },
      optionType: {
        type: "choice",
        options: [
          { value: "default", label: "Radio" },
          { value: "button", label: "Button" },
        ],
        hidden: (ps) => !!ps.useChildren,
        defaultValueHint: "default",
      },
      value: {
        type: "choice",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "Default selected value",
        options: (ps: any) => {
          if (ps.useChildren) {
            const options = new Set<string>();
            traverseReactEltTree(ps.children, (elt) => {
              if (typeof elt?.props?.value === "string") {
                options.add(elt.props.value);
              }
            });
            return Array.from(options.keys());
          } else {
            return ps.options ?? [];
          }
        },
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      disabled: {
        type: "boolean",
        description: "Disables all radios",
        defaultValueHint: false,
      },
      useChildren: {
        displayName: "Use slot",
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description:
          "Instead of configuring a list of options, customize the contents of the RadioGroup by dragging and dropping Radio in the outline/canvas, inside the 'children' slot. Lets you use any content or formatting within the Radio and RadioButton.",
      },
      children: {
        type: "slot",
        allowedComponents: [
          "plasmic-antd5-radio",
          "plasmic-antd5-radio-button",
        ],
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-radio",
            props: {
              value: "op1",
              children: {
                type: "text",
                value: "Option 1",
              },
            },
          },
          {
            type: "component",
            name: "plasmic-antd5-radio",
            props: {
              value: "op2",
              children: {
                type: "text",
                value: "Option 2",
              },
            },
          },
        ],
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      } as any,
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerRadio",
    importName: "AntdRadioGroup",
    defaultStyles: {
      layout: "hbox",
    },
    ...({
      trapsSelection: true,
    } as any),
  });
}
