import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Dropdown as AntdDropdown } from "antd";
import type { DropdownButtonProps, DropDownProps } from "antd/es/dropdown";

import React from "react";
import { Registerable } from "./registerable";

export const DropdownButton: typeof AntdDropdown.Button = AntdDropdown.Button;

export class Dropdown extends React.Component<DropDownProps> {
  render() {
    const thisProps = this.props as any;
    const finalProps = { ...thisProps };
    finalProps.children =
      typeof thisProps.children === "string" ? (
        <div>{thisProps.children}</div>
      ) : (
        thisProps.children
      );
    return <AntdDropdown {...finalProps}>{}</AntdDropdown>;
  }
}

export const dropdownMeta: CodeComponentMeta<DropDownProps> = {
  name: "AntdDropdown",
  displayName: "Antd Dropdown",
  props: {
    arrow: {
      type: "boolean",
      description: "Whether the dropdown arrow should be visible",
      defaultValueHint: false,
    },
    disabled: {
      type: "boolean",
      description: "Whether the dropdown menu is disabled",
      defaultValueHint: false,
    },
    overlay: {
      type: "slot",
      allowedComponents: ["AntdMenu"],
      defaultValue: [
        {
          type: "component",
          name: "AntdMenu",
        },
      ],
    },
    placement: {
      type: "choice",
      options: [
        "bottomLeft",
        "bottomCenter",
        "bottomRight",
        "topLeft",
        "topCenter",
        "topRight",
      ],
      description: "Placement of popup menu",
      defaultValueHint: "bottomLeft",
    },
    trigger: {
      type: "choice",
      options: ["click", "hover", "contextMenu"],
      description: "The trigger mode which executes the dropdown action",
      defaultValueHint: "hover",
    },
    visible: {
      type: "boolean",
      description: "Toggle visibility of dropdown menu in Plasmic Editor",
      editOnly: true,
      defaultValueHint: false,
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Dropdown",
        },
      ],
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerDropdown",
  importName: "Dropdown",
};

export function registerDropdown(
  loader?: Registerable,
  customDropdownMeta?: CodeComponentMeta<DropDownProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Dropdown, customDropdownMeta ?? dropdownMeta);
}

export const dropdownButtonMeta: CodeComponentMeta<DropdownButtonProps> = {
  name: "AntdDropdownButton",
  displayName: "Antd Dropdown Button",
  props: {
    disabled: {
      type: "boolean",
      description: "Whether the dropdown menu is disabled",
      defaultValueHint: false,
    },
    icon: {
      type: "slot",
      hidePlaceholder: true,
    },
    overlay: {
      type: "slot",
      allowedComponents: ["AntdMenu"],
      defaultValue: [
        {
          type: "component",
          name: "AntdMenu",
        },
      ],
    },
    placement: {
      type: "choice",
      options: [
        "bottomLeft",
        "bottomCenter",
        "bottomRight",
        "topLeft",
        "topCenter",
        "topRight",
      ],
      description: "Placement of popup menu",
      defaultValueHint: "bottomLeft",
    },
    size: {
      type: "choice",
      options: ["small", "medium", "large"],
      description: "Set the size of button",
      defaultValueHint: "medium",
    },
    trigger: {
      type: "choice",
      options: ["click", "hover", "contextMenu"],
      description: "The trigger mode which executes the dropdown action",
      defaultValueHint: "hover",
    },
    type: {
      type: "choice",
      options: ["default", "primary", "ghost", "dashed", "link", "text"],
      description: "Can be set to primary, ghost, dashed, link, text, default",
      defaultValueHint: "default",
    },
    visible: {
      type: "boolean",
      description: "Toggle visibility of dropdown menu in Plasmic Editor",
      editOnly: true,
      defaultValueHint: false,
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Dropdown",
        },
      ],
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerDropdown",
  importName: "DropdownButton",
  parentComponentName: "AntdDropdown",
};

export function registerDropdownButton(
  loader?: Registerable,
  customDropdownButtonMeta?: CodeComponentMeta<DropDownProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    DropdownButton,
    customDropdownButtonMeta ?? dropdownButtonMeta
  );
}
