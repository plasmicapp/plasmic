import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import AntdDropdown, {
  DropdownButtonProps,
  DropDownProps,
} from "antd/lib/dropdown";
import DropdownButton from "antd/lib/dropdown/dropdown-button";
import React from "react";
import { Registerable } from "./registerable";

export class Dropdown extends React.Component<DropDownProps> {
  render() {
    const finalProps = { ...this.props };
    finalProps.children =
      typeof this.props.children === "string" ? (
        <div>{this.props.children}</div>
      ) : (
        this.props.children
      );
    return <AntdDropdown {...finalProps}>{}</AntdDropdown>;
  }
}

export const dropdownMeta: ComponentMeta<DropDownProps> = {
  name: "AntdDropdown",
  displayName: "Antd Dropdown",
  props: {
    arrow: {
      type: "boolean",
      description: "Whether the dropdown arrow should be visible",
    },
    disabled: {
      type: "boolean",
      description: "Whether the dropdown menu is disabled",
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
    },
    trigger: {
      type: "choice",
      options: ["click", "hover", "contextMenu"],
      description: "The trigger mode which executes the dropdown action",
    },
    visible: {
      type: "boolean",
      description: "Whether the dropdown menu is currently visible",
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
  importPath: "@plasmicpkgs/antd",
  importName: "Dropdown",
};

export function registerDropdown(
  loader?: Registerable,
  customDropdownMeta?: ComponentMeta<DropDownProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Dropdown, customDropdownMeta ?? dropdownMeta);
}

export const dropdownButtonMeta: ComponentMeta<DropdownButtonProps> = {
  name: "AntdDropdownButton",
  displayName: "Antd Dropdown Button",
  props: {
    disabled: {
      type: "boolean",
      description: "Whether the dropdown menu is disabled",
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
    },
    size: {
      type: "choice",
      options: ["small", "medium", "large"],
      description: "Set the size of button",
    },
    trigger: {
      type: "choice",
      options: ["click", "hover", "contextMenu"],
      description: "The trigger mode which executes the dropdown action",
    },
    type: {
      type: "choice",
      options: ["default", "primary", "ghost", "dashed", "link", "text"],
      description: "Can be set to primary, ghost, dashed, link, text, default",
    },
    visible: {
      type: "boolean",
      description: "Whether the dropdown menu is currently visible",
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
  importPath: "antd/lib/dropdown/dropdown-button",
  importName: "DropdownButton",
  isDefaultExport: true,
};

export function registerDropdownButton(
  loader?: Registerable,
  customDropdownButtonMeta?: ComponentMeta<DropDownProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    DropdownButton,
    customDropdownButtonMeta ?? dropdownButtonMeta
  );
}
