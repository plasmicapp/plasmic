import React, { ReactNode } from "react";
import { ColorPicker } from "antd";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdColorPicker({
  showTextSwitch,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof ColorPicker>, "onChange"> & {
  showTextSwitch?: boolean;
  onChange?: (color: string) => void;
}) {
  return (
    <ColorPicker
      {...props}
      showText={props.showText || showTextSwitch}
      onChangeComplete={(value: any) => {
        onChange?.(typeof value === "string" ? value : value.toHexString());
      }}
    />
  );
}

export function registerColorPicker(loader?: Registerable) {
  registerComponentHelper(loader, AntdColorPicker, {
    name: "plasmic-antd5-color-picker",
    displayName: "Color Picker",
    props: {
      children: {
        type: "slot",
        hidePlaceholder: true,
        mergeWithParent: true,
      } as any,
      value: {
        displayName: "Color value",
        type: "color",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      showTextSwitch: {
        type: "boolean",
        displayName: "Show text",
      },
      showText: {
        type: "slot",
        hidePlaceholder: true,
      },
      allowClear: "boolean",
      disabled: {
        type: "boolean",
        advanced: true,
      },
      trigger: {
        advanced: true,
        type: "choice",
        options: ["click", "hover"],
        defaultValueHint: "click",
      },
      format: {
        advanced: true,
        type: "choice",
        options: ["hex", "hsb", "rgb"],
        defaultValueHint: "hex",
      },
      onChange: {
        type: "eventHandler",
        argTypes: [
          {
            name: "color",
            type: "string",
          },
        ],
      },
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerColorPicker",
    importName: "AntdColorPicker",
  });
}
