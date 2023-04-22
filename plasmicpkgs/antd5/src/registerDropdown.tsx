import { Dropdown, Menu } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdDropdown(
  props: Omit<React.ComponentProps<typeof Dropdown>, "menu" | "overlay"> & {
    onAction?: (key: string) => void;
    menuItems?: () => React.ReactNode;
  }
) {
  const { children, onAction, menuItems, ...rest } = props;
  return (
    <Dropdown
      {...rest}
      overlay={() => {
        const items = menuItems?.() ?? [];
        return <Menu onClick={(event) => onAction?.(event.key)}>{items}</Menu>;
      }}
    >
      {typeof children === "string" ? <div>{children}</div> : children}
    </Dropdown>
  );
}

/**
 * Note that we don't yet support the simpler `items` prop for configuration.
 */
export function registerDropdown(loader?: Registerable) {
  registerComponentHelper(loader, AntdDropdown, {
    name: "plasmic-antd5-dropdown",
    displayName: "Dropdown",
    props: {
      open: {
        type: "boolean",
        description: "Toggle visibility of dropdown menu in Plasmic Editor",
        editOnly: true,
        uncontrolledProp: "fakeOpen",
        defaultValueHint: false,
      },
      disabled: {
        type: "boolean",
        description: "Whether the dropdown menu is disabled",
        defaultValueHint: false,
      },
      arrow: {
        type: "boolean",
        description: "Whether the dropdown arrow should be visible",
        defaultValueHint: false,
        advanced: true,
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
        advanced: true,
      },
      menuItems: {
        type: "slot",
        allowedComponents: [
          "plasmic-antd5-menu-item",
          "plasmic-antd5-menu-item-group",
          "plasmic-antd5-menu-divider",
          "plasmic-antd5-submenu",
        ],
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
            props: {
              key: "menu-item-1",
            },
          },
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
            props: {
              key: "menu-item-2",
            },
          },
        ],
        renderPropParams: [],
      },
      trigger: {
        type: "choice",
        options: ["click", "hover", "contextMenu"],
        description: "The trigger mode which executes the dropdown action",
        defaultValueHint: "hover",
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-button",
            props: {
              children: {
                type: "text",
                value: "Dropdown",
              },
            },
          },
        ],
      },
      onAction: {
        type: "eventHandler",
        argTypes: [{ name: "key", type: "string" }],
      } as any,
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerDropdown",
    importName: "AntdDropdown",
  });
}
