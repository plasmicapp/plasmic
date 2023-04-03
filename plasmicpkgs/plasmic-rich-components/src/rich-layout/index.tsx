import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { capitalize } from "../common";
import { RichLayout, RichLayoutProps } from "./RichLayout";

export * from "./RichLayout";
export default RichLayout;

const richLayoutMeta: ComponentMeta<RichLayoutProps> = {
  name: "hostless-rich-layout",
  displayName: "Rich Layout",
  props: {
    children: "slot",
    actionsChildren: "slot",
    title: {
      displayName: "Title",
      type: "string",
      defaultValue: "Element",
    },
    logo: {
      displayName: "Logo",
      type: "imageUrl",
      defaultValue: "https://www.plasmic.app/favicon.ico",
    },
    navMenuItems: {
      displayName: "Nav menu items",
      type: "array",
      itemType: {
        type: "object",
        fields: {
          path: "string",
          name: "string",
          // icon: "icon"
        },
      },
      defaultValue: [
        {
          path: "/welcome",
          name: "Welcome",
          // icon: <SmileFilled />,
          component: "./Welcome",
        },
        {
          path: "/admin",
          name: "Admin",
          // icon: <CrownFilled />,
          access: "canAdmin",
          component: "./Admin",
          routes: [
            {
              path: "/admin/sub-page1",
              name: "Sub page 1",
              icon:
                "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
              component: "./Welcome",
            },
            {
              path: "/admin/sub-page2",
              name: "Sub page 2",
              // icon: <CrownFilled />,
              component: "./Welcome",
            },
            {
              path: "/admin/sub-page3",
              name: "Sub page 3",
              // icon: <CrownFilled />,
              component: "./Welcome",
            },
          ],
        },
        {
          name: "List",
          // icon: <TabletFilled />,
          path: "/list",
          component: "./ListTableList",
          routes: [
            {
              path: "/list/sub-page",
              name: "Page group",
              // icon: <CrownFilled />,
              routes: [
                {
                  path: "sub-sub-page1",
                  name: "Sub sub page 1",
                  // icon: <CrownFilled />,
                  component: "./Welcome",
                },
                {
                  path: "sub-sub-page2",
                  name: "Sub sub page 2",
                  // icon: <CrownFilled />,
                  component: "./Welcome",
                },
                {
                  path: "sub-sub-page3",
                  name: "Sub sub page 3",
                  // icon: <CrownFilled />,
                  component: "./Welcome",
                },
              ],
            },
            {
              path: "/list/sub-page2",
              name: "Sub page 2",
              // icon: <CrownFilled />,
              component: "./Welcome",
            },
            {
              path: "/list/sub-page3",
              name: "Sub page 3",
              // icon: <CrownFilled />,
              component: "./Welcome",
            },
          ],
        },
        {
          path: "https://ant.design",
          name: "Extern link",
          // icon: <ChromeFilled />,
        },
      ],
    },
    layout: {
      displayName: "Layout",
      type: "choice",
      options: ["side", "top", "mix"].map((value) => ({
        value,
        label: capitalize(value),
      })),
      defaultValue: "mix",
    },
    siderMenuType: {
      displayName: "Sidebar mode",
      type: "choice",
      options: ["sub", "group"].map((value) => ({
        value,
        label: capitalize(value),
      })),
      defaultValue: "group",
    },
    contentWidth: {
      displayName: "Content width",
      type: "choice",
      options: ["Fluid", "Fixed"],
      defaultValueHint: "Fluid",
    },
    navTheme: {
      displayName: "Theme",
      type: "choice",
      options: [
        { value: "realDark", label: "Dark" },
        { value: "light", label: "Light" },
      ],
    },
    colorPrimary: {
      displayName: "Primary color",
      type: "color",
    },
    fixedHeader: {
      displayName: "Sticky header",
      type: "boolean",
      defaultValue: true,
    },
    fixSiderbar: {
      displayName: "Sticky sidebar",
      type: "boolean",
      defaultValue: true,
    },
    showAvatarMenu: {
      displayName: "Show avatar",
      type: "boolean",
      defaultValue: true,
    },
    avatarLabel: {
      displayName: "Avatar label",
      type: "string",
      defaultValue: "User Name",
    },
    avatarImage: {
      displayName: "Avatar image",
      type: "imageUrl",
      defaultValue:
        "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
    },
    menu: {
      displayName: "Menu",
      type: "object",
      fields: {
        defaultOpenAll: {
          displayName: "Default open all",
          type: "boolean",
        },
        hideMenuWhenCollapsed: {
          // displayName: "",
          type: "boolean",
        },
      },
    },
  },

  defaultStyles: {
    width: "stretch",
    height: "stretch",
  },

  importName: "RichLayout",
  importPath: "@plasmicpkgs/antd-pro/src/RichTable",
};

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: ComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(Component, defaultMeta);
    } else {
      registerComponent(Component, defaultMeta);
    }
  };

  _registerComponent(RichLayout, richLayoutMeta);
}
