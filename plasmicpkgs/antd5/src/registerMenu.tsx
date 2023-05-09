import { Menu } from "antd";
import { Registerable, registerComponentHelper } from "./utils";

export const AntdMenu = Menu;
export const AntdMenuDivider = Menu.Divider;
export const AntdMenuItem = Menu.Item;
export const AntdMenuItemGroup = Menu.ItemGroup;
export const AntdSubMenu = Menu.SubMenu;

const allowedMenuComponents = [
  "plasmic-antd5-menu-item",
  "plasmic-antd5-menu-divider",
  "plasmic-antd5-submenu",
  "plasmic-antd5-menu-item-group",
];

/**
 * Note that the Menu component by itself isn't that useful.
 * It is supposed to be a stateful component, but we don't have state yet (for selected, open, etc.).
 *
 * Nor can you make it non-selectable yet and just make it be a list of clickable things.
 *
 * But we also can't get rid of it right now because it's used by Dropdown.
 *
 * Note also that we don't yet support the simpler `items` prop for configuration.
 */
export function registerMenu(loader?: Registerable) {
  registerComponentHelper(loader, AntdMenu, {
    name: "plasmic-antd5-menu",
    displayName: "Menu",
    props: {
      expandIcon: {
        type: "slot",
        hidePlaceholder: true,
      },
      mode: {
        type: "choice",
        options: ["horizontal", "vertical", "inline"],
        description: "Type of menu",
        defaultValueHint: "vertical",
      },
      multiple: {
        type: "boolean",
        description: "Allows selection of multiple items",
        defaultValueHint: false,
      },
      triggerSubMenuAction: {
        type: "choice",
        options: ["hover", "click"],
        description: "Which action can trigger submenu open/close",
        defaultValueHint: "hover",
        advanced: true,
      },
      children: {
        type: "slot",
        allowedComponents: allowedMenuComponents,
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
            props: {
              key: "menuItemKey1",
            },
          },
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
            props: {
              key: "menuItemKey2",
            },
          },
        ],
      },
      onSelect: {
        type: "eventHandler",
        argTypes: [{ name: "key", type: "string" }],
      } as any,
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerMenu",
    importName: "AntdMenu",
  });

  registerComponentHelper(loader, AntdMenuItem, {
    name: "plasmic-antd5-menu-item",
    displayName: "Menu Item",
    props: {
      danger: {
        type: "boolean",
        description: "Display the danger style",
        defaultValueHint: false,
      },
      disabled: {
        type: "boolean",
        description: "Whether disabled select",
        defaultValueHint: false,
      },
      key: {
        type: "string",
        displayName: "Unique key",
        description:
          "Unique ID of the menu item. Used to determine which item is selected.",
        defaultValue: "menuItemKey",
      },
      title: {
        type: "string",
        description: "Set display title for collapsed item",
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Menu item",
          },
        ],
        ...({ mergeWithParent: true } as any),
      },
      onClick: {
        type: "eventHandler",
        argTypes: [],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerMenu",
    importName: "AntdMenuItem",
    parentComponentName: "plasmic-antd5-menu",
  });

  registerComponentHelper(loader, AntdMenuItemGroup, {
    name: "plasmic-antd5-menu-item-group",
    displayName: "Item Group",
    props: {
      title: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Group",
          },
        ],
      },
      children: {
        type: "slot",
        allowedComponents: allowedMenuComponents,
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
          },
        ],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerMenu",
    importName: "AntdMenuItemGroup",
    parentComponentName: "plasmic-antd5-menu",
  });

  registerComponentHelper(loader, AntdMenuDivider, {
    name: "plasmic-antd5-menu-divider",
    displayName: "Menu Divider",
    props: {
      dashed: {
        type: "boolean",
        description: "Whether line is dashed",
        defaultValueHint: false,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerMenu",
    importName: "AntdMenuDivider",
    parentComponentName: "plasmic-antd5-menu",
  });

  registerComponentHelper(loader, AntdSubMenu, {
    name: "plasmic-antd5-submenu",
    displayName: "Sub Menu",
    props: {
      disabled: {
        type: "boolean",
        description: "Whether sub-menu is disabled",
        defaultValueHint: false,
      },
      key: {
        type: "string",
        displayName: "Unique key",
        description:
          "Unique ID of the sub-menu. Used to determine which item is selected.",
        advanced: true,
      },
      title: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Sub-menu",
          },
        ],
      },
      children: {
        type: "slot",
        allowedComponents: allowedMenuComponents,
        defaultValue: [1, 2].map((i) => ({
          type: "component",
          name: "plasmic-antd5-menu-item",
          props: {
            key: `subMenuItemKey${i}`,
            children: [
              {
                type: "text",
                value: `Sub-menu item ${i}`,
              },
            ],
          },
        })),
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerMenu",
    importName: "AntdSubMenu",
    parentComponentName: "plasmic-antd5-menu",
  });
}
