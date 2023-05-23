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
        path: "href",
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
  displayName: "Rich Page Layout",
  props: {
    children: {
      type: "slot",
      unstable__isMainContentSlot: true,
    },
    actionsChildren: {
      type: "slot",
      hidePlaceholder: true,
    },
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
        path: "/",
        name: "Link 1",
      },
      {
        path: "/",
        name: "Link 2",
      },
    ]),

    layout: {
      displayName: "Layout",
      type: "choice",
      options: ["side", "top", "mix"].map((value) => ({
        value,
        label: capitalize(value),
      })),
      defaultValueHint: "top",
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
      hidden: (ps) => (ps.layout ?? "top") !== "top",
      defaultValueHint: false,
    },
    fixSiderbar: {
      displayName: "Sticky sidebar",
      type: "boolean",
      hidden: (ps) => (ps.layout ?? "top") !== "side",
      defaultValueHint: false,
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
    width: "full-bleed",
    height: "stretch",
  },

  importName: "RichLayout",
  importPath: "@plasmicpkgs/plasmic-rich-components",
};

export function registerRichLayout(loader?: Registerable) {
  registerComponentHelper(loader, RichLayout, richLayoutMeta);
}
