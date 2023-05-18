import { Dropdown, Menu } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";
import { UNKEYED_MENU_ITEM_TYPE } from "./registerMenu";

export function AntdDropdown(
  props: Omit<React.ComponentProps<typeof Dropdown>, "menu" | "overlay"> & {
    onAction?: (key: string) => void;
    menuItems?: () => React.ReactNode;
    useMenuItemsSlot?: boolean;
    menuItemsJson?: React.ComponentProps<typeof Menu>["items"];
    trigger?: "click" | "hover" | "contextMenu";
  }
) {
  const {
    children,
    onAction,
    menuItems,
    useMenuItemsSlot = false,
    menuItemsJson,
    trigger = "click",
    ...rest
  } = props;
  return (
    <Dropdown
      {...rest}
      trigger={[trigger]}
      overlay={() => {
        const itemsChildren = useMenuItemsSlot
          ? menuItems?.() ?? []
          : undefined;
        const items = useMenuItemsSlot ? undefined : menuItemsJson;
        return (
          <Menu onClick={(event) => onAction?.(event.key)} items={items}>
            {itemsChildren}
          </Menu>
        );
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
      menuItems: {
        type: "slot",
        displayName: "Menu items",
        hidden: (ps) => !ps.useMenuItemsSlot,
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
      menuItemsJson: {
        type: "array",
        displayName: "Menu Items",
        hidden: (ps) => !!ps.useMenuItemsSlot,
        itemType: UNKEYED_MENU_ITEM_TYPE as any,
        defaultValue: [
          {
            type: "item",
            value: "action1",
            label: "Action 1",
          },
          {
            type: "item",
            value: "action2",
            label: "Action 2",
          },
        ],
      },
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
      trigger: {
        type: "choice",
        options: [
          { value: "click", label: "Click" },
          { value: "hover", label: "Hover" },
          { value: "contextMenu", label: "Right-click" },
        ],
        description: "The trigger mode which executes the dropdown action",
        defaultValueHint: "click",
      },
      useMenuItemsSlot: {
        type: "boolean",
        displayName: "Use menu items slot",
        advanced: true,
        description:
          "Instead of configuring a list of menu items, build the menu items using MenuItem elements. This gives you greater control over item styling.",
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
        ...({ mergeWithParent: true } as any),
      },
      arrow: {
        type: "boolean",
        description: "Whether the dropdown arrow should be visible",
        defaultValueHint: false,
        advanced: true,
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
