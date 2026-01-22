import { PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  CanvasComponentProps,
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";

interface Props extends CanvasComponentProps {
  brand?: React.ReactNode;
  menuItems?: React.ReactNode;
  className?: string;
  closeButton?: React.ReactNode;
  openButton?: React.ReactNode;
  forceOpenMenu?: boolean;
  itemsGap?: number;
  responsiveBreakpoint?: number;
}

const CSSClasses = {
  container: "plasmic-nav-container",
  menuButton: "plasmic-nav-menu-button",
  menuItemsContainer: "plasmic-nav-menu-items",
  menuItemsContainerOpen: "plasmic-nav-menu-items-open",
};

const DEFAULT_GAP = 8;
const DEFAULT_RESPONSIVE_BREAKPOINT = 768;
export function NavigationBar(props: Props) {
  const { forceOpenMenu } = props;
  const [isOpen, setIsOpen] = React.useState(false);
  const inEditor = React.useContext(PlasmicCanvasContext);

  const shouldRenderMenu = React.useMemo(() => {
    if (inEditor && forceOpenMenu) {
      return true;
    }

    return isOpen;
  }, [inEditor, forceOpenMenu, isOpen]);

  const toggleMenu = () => setIsOpen((value) => !value);

  // Parsing the gap manually to ensure it's a valid number
  // as we are using it in dangerouslySetInnerHTML.
  const gap = safeParseNumber(props.itemsGap, DEFAULT_GAP);
  const responsiveBreakpoint = safeParseNumber(
    props.responsiveBreakpoint,
    DEFAULT_RESPONSIVE_BREAKPOINT
  );

  const cssStyles = React.useMemo(
    () =>
      minifyCss(`
    /* Shared Styles */
    .${CSSClasses.container} {
      box-sizing: border-box;
    }

    .${CSSClasses.menuItemsContainer} {
      box-sizing: border-box;
      display: flex;
    }

    .${CSSClasses.menuItemsContainer} > * {
      flex: 0 0 auto;
    }

    /* Desktop Styles */
    @media (min-width: ${responsiveBreakpoint + 1}px) {
      .${CSSClasses.menuButton} {
        display: none;
      }

      .${CSSClasses.menuItemsContainer} {
        flex-direction: row;
        align-items: center;
        width: auto;
      }
      .${CSSClasses.menuItemsContainer} > *:not(:first-child) {
        margin-inline-start: ${gap}px;
      }
    }

    /* Mobile Styles */
    @media (max-width: ${responsiveBreakpoint}px) {
      .${CSSClasses.menuButton} {
        unset: all;
        -webkit-appearance: none;
        min-width: 40px;
        min-height: 40px;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        cursor: pointer;
      }

      .${CSSClasses.menuItemsContainer}:not(.${
        CSSClasses.menuItemsContainerOpen
      }) {
        display: none;
      }

      .${CSSClasses.menuItemsContainer} {
        margin-top: 10px;
        flex-direction: column;
        flex-shrink: 0;
        width: 100%;
      }
      .${CSSClasses.menuItemsContainer} > *:not(:first-child) {
        margin-top: ${gap}px;
      }
    }
    `),
    [gap, responsiveBreakpoint]
  );

  return (
    <div className={`${CSSClasses.container} ${props.className}`}>
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      <div>{props.brand}</div>
      <button
        className={CSSClasses.menuButton}
        onClick={toggleMenu}
        tabIndex={0}
        aria-expanded={shouldRenderMenu}
      >
        {shouldRenderMenu ? props.closeButton : props.openButton}
      </button>
      <nav
        role="menu"
        className={`${CSSClasses.menuItemsContainer} ${
          shouldRenderMenu ? CSSClasses.menuItemsContainerOpen : ""
        }`.trim()}
      >
        {props.menuItems}
      </nav>
    </div>
  );
}

function safeParseNumber(input: any, defaultValue: number = 0) {
  const parsedValue = parseInt(input, 10);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

function minifyCss(input: string) {
  return input
    .replace(/\s{2,}|\n/g, "") //  Remove spaces
    .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/g, ""); // Remove comments.
}

export const navigationBarComponentMeta: CodeComponentMeta<Props> = {
  name: `hostless-plasmic-navigation-bar`,
  displayName: "Navigation Bar",
  importName: "NavigationBar",
  importPath: "@plasmicpkgs/plasmic-nav",
  props: {
    // Properties
    forceOpenMenu: {
      displayName: "Force Open Menu",
      description:
        "Use this option to open the menu during design time so you can easily customize the close button and menu items for small screens. This option is ignored when publishing the page.",
      type: "boolean",
    },
    itemsGap: {
      displayName: "Items Gap",
      description: "The width of the space between menu items in pixels.",
      type: "number",
      min: 0,
      defaultValue: DEFAULT_GAP,
    },
    responsiveBreakpoint: {
      displayName: "Small Screens Breakpoint",
      description:
        "The maximum screen width used for showing the small screens version of the menu.",
      type: "number",
      min: 0,
      defaultValue: DEFAULT_RESPONSIVE_BREAKPOINT,
    },

    // Slots
    brand: {
      type: "slot",
      defaultValue: [
        {
          type: "hbox",
          tag: "a",
          attrs: { href: "#" },
          styles: { padding: "0px" },
          children: {
            type: "img",
            src: "https://static1.plasmic.app/nav-logo-placeholder.svg",
            styles: { height: "40px" },
          },
        },
      ],
    },
    openButton: {
      type: "slot",
      defaultValue: {
        type: "img",
        src: "https://static1.plasmic.app/menu.svg",
      },
    },
    closeButton: {
      type: "slot",
      defaultValue: {
        type: "img",
        src: "https://static1.plasmic.app/close.svg",
      },
    },
    menuItems: {
      type: "slot",
      defaultValue: ["Home", "About", "Contact"].map((title) => ({
        type: "text",
        tag: "a",
        attrs: { href: "/" },
        styles: { width: "auto" },
        value: title,
      })),
    },
  },
  defaultStyles: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    padding: "16px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "20px",
  },
};

export function registerNavigationBar(
  loader?: { registerComponent: typeof registerComponent },
  customMetaProps?: CodeComponentMeta<
    React.ComponentProps<typeof NavigationBar>
  >
) {
  if (loader) {
    loader.registerComponent(
      NavigationBar,
      customMetaProps ?? navigationBarComponentMeta
    );
  } else {
    registerComponent(
      NavigationBar,
      customMetaProps ?? navigationBarComponentMeta
    );
  }
}
