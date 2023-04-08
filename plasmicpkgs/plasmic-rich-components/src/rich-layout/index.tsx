import {
  ComponentMeta,
  JSONLikeType,
} from "@plasmicapp/host/registerComponent";
import { capitalize } from "../common";
import { Registerable, registerComponentHelper } from "../utils";
import { RichLayout, RichLayoutProps } from "./RichLayout";

export * from "./RichLayout";
export default RichLayout;

function generateNavMenuType(
  remainingDepth: number,
  displayName?: string,
  defaultValue?: any[]
): object & JSONLikeType<any> {
  return {
    displayName: displayName ? displayName : "Nested items",
    type: "array",
    defaultValue,
    itemType: {
      type: "object",
      nameFunc: (item: any) =>
        item.name || (!displayName ? "Unnamed nested item" : "Unnamed item"),
      fields: {
        path: "string",
        name: "string",
        ...(remainingDepth === 0
          ? {}
          : {
              routes: generateNavMenuType(remainingDepth - 1),
            }),
      },
    },
  } as const;
}

const richLayoutMeta: ComponentMeta<RichLayoutProps> = {
  name: "hostless-rich-layout",
  displayName: "Rich Layout",
  props: {
    children: "slot",
    actionsChildren: "slot",
    title: {
      displayName: "Title",
      type: "string",
      defaultValue: "App title",
    },
    logo: {
      displayName: "Logo",
      type: "imageUrl",
      defaultValue: "https://www.plasmic.app/favicon.ico",
    },
    navMenuItems: generateNavMenuType(2, "Nav menu items", [
      {
        path: "/welcome",
        name: "Welcome",
        // icon: <SmileFilled />,
        // component: "./Welcome",
      },
      {
        path: "/admin",
        name: "Admin",
        // icon: <CrownFilled />,
        // access: "canAdmin",
        // component: "./Admin",
        routes: [
          {
            path: "/admin/sub-page1",
            name: "Sub page 1",
            // icon: "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
            // component: "./Welcome",
          },
          {
            path: "/admin/sub-page2",
            name: "Sub page 2",
            // icon: <CrownFilled />,
            // component: "./Welcome",
          },
          {
            path: "/admin/sub-page3",
            name: "Sub page 3",
            // icon: <CrownFilled />,
            // component: "./Welcome",
          },
        ],
      },
      {
        name: "List",
        // icon: <TabletFilled />,
        path: "/list",
        // component: "./ListTableList",
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
                // component: "./Welcome",
              },
              {
                path: "sub-sub-page2",
                name: "Sub sub page 2",
                // icon: <CrownFilled />,
                // component: "./Welcome",
              },
              {
                path: "sub-sub-page3",
                name: "Sub sub page 3",
                // icon: <CrownFilled />,
                // component: "./Welcome",
              },
            ],
          },
          {
            path: "/list/sub-page2",
            name: "Sub page 2",
            // icon: <CrownFilled />,
            // component: "./Welcome",
          },
          {
            path: "/list/sub-page3",
            name: "Sub page 3",
            // icon: <CrownFilled />,
            // component: "./Welcome",
          },
        ],
      },
      {
        path: "https://ant.design",
        name: "Extern link",
        // icon: <ChromeFilled />,
      },
    ]),

    layout: {
      displayName: "Layout",
      type: "choice",
      options: ["side", "top", "mix"].map((value) => ({
        value,
        label: capitalize(value),
      })),
      defaultValue: "mix",
    },

    // Advanced, show later

    /*
    siderMenuType: {
      displayName: "Sidebar mode",
      type: "choice",
      options: ["sub", "group"].map((value) => ({
        value,
        label: capitalize(value),
      })),
      defaultValue: "sub",
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
    */
    fixedHeader: {
      displayName: "Sticky header",
      type: "boolean",
      defaultValue: false,
    },
    fixSiderbar: {
      displayName: "Sticky sidebar",
      type: "boolean",
      defaultValue: false,
    },
    /*
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
     */
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
  importPath:
    "@plasmicpkgs/plasmic-rich-components/dist/rich-layout/RichLayout",
};

export function registerRichLayout(loader?: Registerable) {
  registerComponentHelper(loader, RichLayout, richLayoutMeta);
}
