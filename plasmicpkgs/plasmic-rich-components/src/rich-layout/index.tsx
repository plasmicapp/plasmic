import {
  CodeComponentMeta,
  JSONLikeType,
} from "@plasmicapp/host/registerComponent";
import { capitalize } from "../common";
import { Registerable, registerComponentHelper } from "../utils";
import { RichLayout, RichLayoutProps } from "./RichLayout";

export * from "./RichLayout";
export default RichLayout;

function generateNavMenuType(
  isNested: boolean,
  remainingDepth: number,
  displayName?: string,
  defaultValue?: any[]
): object & JSONLikeType<any> {
  return {
    displayName: displayName ? displayName : "Nested items",
    type: "array",
    defaultValue,
    advanced: isNested,
    itemType: {
      type: "object",
      nameFunc: (item: any) =>
        item.name || (!displayName ? "Unnamed nested item" : "Unnamed item"),
      fields: {
        path: "href",
        name: "string",
        condition: {
          advanced: true,
          displayName: "Show only if",
          type: "exprEditor" as any,
        },
        ...(remainingDepth === 0
          ? {}
          : {
              routes: generateNavMenuType(true, remainingDepth - 1),
            }),
      },
    },
  } as const;
}

const richLayoutMeta: CodeComponentMeta<RichLayoutProps> = {
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
      hidden: (ps) => !ps.logo,
    },
    logoElement: {
      type: "slot",
      displayName: "Logo",
      defaultValue: {
        type: "img",
        src: "https://static1.plasmic.app/fake-logo.svg",
      },
      hidden: (ps) => !!ps.logo,
    },
    navMenuItems: generateNavMenuType(false, 2, "Nav menu items", [
      {
        path: "/",
        name: "Home",
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
  importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-layout",
};

export function registerRichLayout(loader?: Registerable) {
  registerComponentHelper(loader, RichLayout, richLayoutMeta);
}
