import Menu from "antd/es/menu";
import { Registerable, registerComponentHelper } from "./utils";

export const AntdMenu = Menu;
export const AntdMenuDivider = Menu.Divider;
export const AntdMenuItem = Menu.Item;
export const AntdMenuItemGroup = Menu.ItemGroup;
export const AntdSubMenu = Menu.SubMenu;

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
        allowedComponents: [
          "plasmic-antd5-menu-item",
          "plasmic-antd5-menu-divider",
          "plasmic-antd5-submenu",
          "plasmic-antd5-menu-group",
        ],
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
          },
          {
            type: "component",
            name: "plasmic-antd5-menu-item",
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
        description: "Unique ID of the menu item",
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
            value: "Option",
          },
        ],
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
        allowedComponents: [
          "plasmic-antd5-menu-item",
          "plasmic-antd5-menu-divider",
          "plasmic-antd5-menu-item-group",
          "plasmic-antd5-submenu",
        ],
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
        description: "Unique ID of the sub-menu",
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
        allowedComponents: [
          "plasmic-antd5-menu-item",
          "plasmic-antd5-menu-divider",
          "plasmic-antd5-menu-item-group",
          "plasmic-antd5-submenu",
        ],
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
