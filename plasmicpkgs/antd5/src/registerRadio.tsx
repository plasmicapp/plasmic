import Radio, { RadioChangeEvent } from "antd/es/radio";
import RadioGroup from "antd/es/radio/group";
import RadioButton from "antd/es/radio/radioButton";
import React from "react";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";

export const AntdRadio = Radio;
export const AntdRadioButton = RadioButton;
export function AntdRadioGroup(
  props: Omit<React.ComponentProps<typeof RadioGroup>, "onChange"> & {
    onChange?: (value?: string) => void;
  }
) {
  const { onChange, ...rest } = props;
  const wrappedOnChange = React.useMemo(() => {
    if (onChange) {
      return (event: RadioChangeEvent) => onChange(event.target.value);
    } else {
      return undefined;
    }
  }, [onChange]);
  return <RadioGroup {...rest} onChange={wrappedOnChange} />;
}

export function registerRadio(loader?: Registerable) {
  registerComponentHelper(loader, AntdRadio, {
    name: "plasmic-antd5-radio",
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
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerRadio",
    importName: "AntdRadio",
    parentComponentName: "plasmic-antd5-radio-group",
  });
  registerComponentHelper(loader, AntdRadio, {
    name: "plasmic-antd5-radio-button",
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
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerRadio",
    importName: "AntdRadioButton",
    parentComponentName: "plasmic-antd5-radio-group",
  });

  registerComponentHelper(loader, AntdRadioGroup, {
    name: "plasmic-antd5-radio-group",
    displayName: "Radio Group",
    props: {
      value: {
        type: "choice",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "Default selected value",
        options: (ps: any) => {
          const options = new Set<string>();
          traverseReactEltTree(ps.children, (elt) => {
            if (typeof elt?.props?.value === "string") {
              options.add(elt.props.value);
            }
          });
          return Array.from(options.keys());
        },
      },
      disabled: {
        type: "boolean",
        description: "Disables all radios",
        defaultValueHint: false,
      },
      children: {
        type: "slot",
        allowedComponents: [
          "plasmic-antd5-radio",
          "plasmic-antd5-radio-button",
        ],
        // Error right now when using default slot content with stateful instances
        // defaultValue: [
        //   {
        //     type: "component",
        //     name: "plasmic-antd5-radio",
        //   },
        // ],
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      } as any,
    },
    unstable__states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    importPath: "@plasmicapp/antd5/skinny/registerRadio",
    importName: "AntdRadioGroup",
  });
}
