import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { MenuItemProps, MenuProps, SubMenuProps } from "antd";
import { MenuDividerProps } from "antd/lib/menu";
import Menu from "antd/lib/menu/index";
import MenuDivider from "antd/lib/menu/MenuDivider";
import MenuItem from "antd/lib/menu/MenuItem";
import SubMenu from "antd/lib/menu/SubMenu";
import { ItemGroup, MenuItemGroupProps } from "rc-menu";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

export const menuDividerMeta: ComponentMeta<MenuDividerProps> = {
  name: "AntdMenuDivider",
  displayName: "Antd Menu Divider",
  props: {
    dashed: {
      type: "boolean",
      description: "Whether line is dashed",
    },
  },
  importPath: "antd/lib/menu/MenuDivider",
  importName: "MenuDivider",
  isDefaultExport: true,
  parentComponentName: "AntdMenu",
};

export function registerMenuDivider(
  loader?: Registerable,
  customMenuDividerMeta?: ComponentMeta<MenuDividerProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(MenuDivider, customMenuDividerMeta ?? menuDividerMeta);
}

export const menuItemMeta: ComponentMeta<MenuItemProps> = {
  name: "AntdMenuItem",
  displayName: "Antd Menu Item",
  props: {
    danger: {
      type: "boolean",
      description: "Display the danger style",
    },
    disabled: {
      type: "boolean",
      description: "Whether disabled select",
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
  importPath: "antd/lib/menu/MenuItem",
  importName: "MenuItem",
  isDefaultExport: true,
  parentComponentName: "AntdMenu",
};

export function registerMenuItem(
  loader?: Registerable,
  customMenuItemMeta?: ComponentMeta<MenuItemProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(MenuItem, customMenuItemMeta ?? menuItemMeta);
}

export const menuItemGroupMeta: ComponentMeta<MenuItemGroupProps> = {
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
  importPath: "rc-menu",
  importName: "ItemGroup",
  parentComponentName: "AntdMenu",
};

export function registerMenuItemGroup(
  loader?: Registerable,
  customMenuItemGroupMeta?: ComponentMeta<MenuItemProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(ItemGroup, customMenuItemGroupMeta ?? menuItemGroupMeta);
}

export const subMenuMeta: ComponentMeta<SubMenuProps> = {
  name: "AntdSubMenu",
  displayName: "Antd SubMenu",
  props: {
    disabled: {
      type: "boolean",
      description: "Whether sub-menu is disabled",
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
  importPath: "antd/lib/menu/SubMenu",
  importName: "SubMenu",
  isDefaultExport: true,
  parentComponentName: "AntdMenu",
};

export function registerSubMenu(
  loader?: Registerable,
  customSubMenuMeta?: ComponentMeta<SubMenuProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(SubMenu, customSubMenuMeta ?? subMenuMeta);
}

export const menuMeta: ComponentMeta<MenuProps> = {
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
    },
    inlineIndent: {
      type: "number",
      description: "Indent (in pixels) of inline menu items on each level",
    },
    mode: {
      type: "choice",
      options: ["horizontal", "vertical", "inline"],
      description: "Type of menu",
    },
    multiple: {
      type: "boolean",
      description: "Allows selection of multiple items",
    },
    openKeys: {
      type: "choice",
      editOnly: true,
      uncontrolledProp: "defaultOpenKeys",
      description: "Array with the keys of default opened sub menus",
      multiSelect: true,
      options: (componentProps) => {
        const options = new Set<string>();
        traverseReactEltTree(componentProps.children, (elt) => {
          if (elt?.type === SubMenu && typeof elt?.key === "string") {
            options.add(elt.key);
          }
        });
        return Array.from(options.keys());
      },
    },
    overflowedIndicator: {
      type: "slot",
      hidePlaceholder: true,
    },
    selectable: {
      type: "boolean",
      description: "Allows selecting menu items",
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
    },
    subMenuOpenDelay: {
      type: "number",
      description: "Delay time to show submenu when mouse enters, (in seconds)",
    },
    theme: {
      type: "choice",
      options: ["light", "dark"],
      description: "Color theme of the menu",
    },
    triggerSubMenuAction: {
      type: "choice",
      options: ["hover", "click"],
      description: "Which action can trigger submenu open/close",
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
  importPath: "antd/lib/menu/index",
  importName: "Menu",
  isDefaultExport: true,
};

export function registerMenu(
  loader?: Registerable,
  customMenuMeta?: ComponentMeta<MenuProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Menu, customMenuMeta ?? menuMeta);
}
