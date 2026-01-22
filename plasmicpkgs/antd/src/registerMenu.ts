import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Menu as AntdMenu } from "antd";
import type {
  MenuDividerProps,
  MenuItemProps,
  MenuProps,
  SubMenuProps,
} from "antd/es/menu";
import type { MenuItemGroupProps } from "rc-menu";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";
export const Menu = AntdMenu;
export const MenuDivider = Menu.Divider;
export const MenuItemGroup = Menu.ItemGroup;
export const MenuItem = Menu.Item;
export const SubMenu = Menu.SubMenu;

export const menuDividerMeta: CodeComponentMeta<MenuDividerProps> = {
  name: "AntdMenuDivider",
  displayName: "Antd Menu Divider",
  props: {
    dashed: {
      type: "boolean",
      description: "Whether line is dashed",
      defaultValueHint: false,
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerMenu",
  importName: "MenuDivider",
  parentComponentName: "AntdMenu",
};

export function registerMenuDivider(
  loader?: Registerable,
  customMenuDividerMeta?: CodeComponentMeta<MenuDividerProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(MenuDivider, customMenuDividerMeta ?? menuDividerMeta);
}

export const menuItemMeta: CodeComponentMeta<MenuItemProps> = {
  name: "AntdMenuItem",
  displayName: "Antd Menu Item",
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
  importPath: "@plasmicpkgs/antd/skinny/registerMenu",
  importName: "MenuItem",
  parentComponentName: "AntdMenu",
};

export function registerMenuItem(
  loader?: Registerable,
  customMenuItemMeta?: CodeComponentMeta<MenuItemProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(MenuItem, customMenuItemMeta ?? menuItemMeta);
}

export const menuItemGroupMeta: CodeComponentMeta<MenuItemGroupProps> = {
  name: "AntdMenuItemGroup",
  displayName: "Antd Menu Item Group",
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
        "AntdMenuItem",
        "AntdMenuDivider",
        "AntdMenuItemGroup",
      ],
      defaultValue: [
        {
          type: "component",
          name: "AntdMenuItem",
        },
      ],
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerMenu",
  importName: "MenuItemGroup",
  parentComponentName: "AntdMenu",
};

export function registerMenuItemGroup(
  loader?: Registerable,
  customMenuItemGroupMeta?: CodeComponentMeta<MenuItemProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    MenuItemGroup,
    customMenuItemGroupMeta ?? menuItemGroupMeta
  );
}

export const subMenuMeta: CodeComponentMeta<SubMenuProps> = {
  name: "AntdSubMenu",
  displayName: "Antd SubMenu",
  props: {
    disabled: {
      type: "boolean",
      description: "Whether sub-menu is disabled",
      defaultValueHint: false,
    },
    key: {
      type: "string",
      description: "Unique ID of the sub-menu",
      defaultValue: "subMenuKey",
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
        "AntdMenuItem",
        "AntdMenuDivider",
        "AntdMenuItemGroup",
        "AntdSubMenu",
      ],
      defaultValue: [1, 2].map((i) => ({
        type: "component",
        name: "AntdMenuItem",
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
  importPath: "@plasmicpkgs/antd/skinny/registerMenu",
  importName: "SubMenu",
  parentComponentName: "AntdMenu",
};

export function registerSubMenu(
  loader?: Registerable,
  customSubMenuMeta?: CodeComponentMeta<SubMenuProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(SubMenu, customSubMenuMeta ?? subMenuMeta);
}

function getOpenKeysOptions(componentProps: MenuProps) {
  const options = new Set<string>();
  traverseReactEltTree(componentProps.children, (elt) => {
    if (elt?.type === SubMenu && typeof elt?.key === "string") {
      options.add(elt.key);
    }
  });
  return Array.from(options.keys());
}

export const menuMeta: CodeComponentMeta<MenuProps> = {
  name: "AntdMenu",
  displayName: "Antd Menu",
  props: {
    expandIcon: {
      type: "slot",
      hidePlaceholder: true,
    },
    forceSubMenuRender: {
      type: "boolean",
      description: "Render submenu into DOM before it becomes visible",
      defaultValueHint: false,
    },
    inlineIndent: {
      type: "number",
      description: "Indent (in pixels) of inline menu items on each level",
      defaultValueHint: 24,
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
    openKeys: {
      type: "choice",
      editOnly: true,
      description: "Array with the keys of default opened sub menus",
      multiSelect: true,
      options: getOpenKeysOptions,
    },
    onOpenChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "openKeys",
          type: {
            type: "choice",
            multiSelect: true,
            options: getOpenKeysOptions,
          },
        },
      ],
    },
    overflowedIndicator: {
      type: "slot",
      hidePlaceholder: true,
    },
    selectable: {
      type: "boolean",
      description: "Allows selecting menu items",
      defaultValueHint: true,
    },
    selectedKeys: {
      type: "choice",
      editOnly: true,
      uncontrolledProp: "defaultSelectedKeys",
      description: "Array with the keys of default selected menu items",
      multiSelect: true,
      options: (componentProps) => {
        const options = new Set<string>();
        traverseReactEltTree(componentProps.children, (elt) => {
          if (
            [SubMenu, MenuItem as any].includes(elt?.type) &&
            typeof elt?.key === "string"
          ) {
            options.add(elt.key);
          }
        });
        return Array.from(options.keys());
      },
    },
    subMenuCloseDelay: {
      type: "number",
      description: "Delay time to hide submenu when mouse leaves (in seconds)",
      defaultValueHint: 0.1,
    },
    subMenuOpenDelay: {
      type: "number",
      description: "Delay time to show submenu when mouse enters, (in seconds)",
      defaultValueHint: 0,
    },
    theme: {
      type: "choice",
      options: ["light", "dark"],
      description: "Color theme of the menu",
      defaultValueHint: "light",
    },
    triggerSubMenuAction: {
      type: "choice",
      options: ["hover", "click"],
      description: "Which action can trigger submenu open/close",
      defaultValueHint: "hover",
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdMenuItem", "AntdMenuDivider", "AntdSubMenu"],
      defaultValue: [
        {
          type: "component",
          name: "AntdMenuItem",
        },
        {
          type: "component",
          name: "AntdSubMenu",
        },
      ],
    },
  },
  states: {
    openKeys: {
      type: "writable",
      variableType: "array",
      valueProp: "openKeys",
      onChangeProp: "onOpenChange",
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerMenu",
  importName: "Menu",
};

export function registerMenu(
  loader?: Registerable,
  customMenuMeta?: CodeComponentMeta<MenuProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Menu, customMenuMeta ?? menuMeta);
}
