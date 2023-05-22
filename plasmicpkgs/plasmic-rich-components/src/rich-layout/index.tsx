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
  displayName: "Rich App Layout",
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

    simpleNavTheme: {
      displayName: "Theme",
      type: "object",
      fields: {
        scheme: {
          type: "choice",
          options: ["default", "primary", "light", "dark", "custom"].map(
            (v) => ({
              label: capitalize(v),
              value: v,
            })
          ),
          defaultValueHint: "default",
        },
        customBgColor: {
          type: "color",
          displayName: "Custom color",
          hidden: (props) => !(props.simpleNavTheme?.scheme === "custom"),
          defaultValue: "#D73B58",
        },
      },
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
    minHeight: "100vh",
  },

  importName: "RichLayout",
  importPath: "@plasmicpkgs/plasmic-rich-components",
};

export function registerRichLayout(loader?: Registerable) {
  registerComponentHelper(loader, RichLayout, richLayoutMeta);
}
