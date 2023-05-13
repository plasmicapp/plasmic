import { Switch } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdSwitch(props: React.ComponentProps<typeof Switch>) {
  return <Switch {...props} />;
}
AntdSwitch.__plasmicFormFieldMeta = { valueProp: "checked" };

export function registerSwitch(loader?: Registerable) {
  registerComponentHelper(loader, AntdSwitch, {
    name: "plasmic-antd5-switch",
    displayName: "Switch",
    props: {
      checked: {
        type: "boolean",
        editOnly: true,
        uncontrolledProp: "defaultChecked",
        description: "Whether the switch is toggled on",
        defaultValueHint: false,
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      disabled: {
        type: "boolean",
        description: "If switch is disabled",
        defaultValueHint: false,
      },
      autoFocus: {
        type: "boolean",
        description: "If get focus when component mounted",
        defaultValueHint: false,
        advanced: true,
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
    importPath: "@plasmicpkgs/antd5/skinny/registerSwitch",
    importName: "AntdSwitch",
  });
}
