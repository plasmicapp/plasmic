import { ComponentMeta, PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, {
  ComponentProps,
  createContext,
  useContext,
  useState,
} from "react";

export interface NavContextValue {
  isShown: boolean;
  toggleNav: () => void;
}

export const NavContext = createContext<undefined | NavContextValue>(undefined);

export const useNavContext = (componentName: string) => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error(
      `${componentName} can only be instantiated somewhere inside a NavContainer`
    );
  }
  return context;
};

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [isShown, setShown] = useState(false);
  return (
    <NavContext.Provider
      value={{
        isShown: isShown,
        toggleNav: () => setShown(!isShown),
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export const navProvider: ComponentMeta<ComponentProps<typeof NavProvider>> = {
  name: "hostless-plasmic-nav-provider",
  displayName: "Nav Provider",
  importName: "NavProvider",
  importPath: "@plasmicpkgs/plasmic-nav",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "NavToggle",
          },
          {
            type: "component",
            name: "NavMenu",
          },
        ],
      },
    },
  },
};

export function registerNavProvider(
  loader?: { registerComponent: typeof registerComponent },
  customNavProvider?: ComponentMeta<ComponentProps<typeof NavProvider>>
) {
  if (loader) {
    loader.registerComponent(NavProvider, customNavProvider ?? navProvider);
  } else {
    registerComponent(NavProvider, customNavProvider ?? navProvider);
  }
}

export function NavMenu({
  className,
  children,
  showInEditor,
}: {
  className?: string;
  children: React.ReactNode;
  showInEditor?: boolean;
}) {
  const { isShown } = useNavContext("NavMenu");
  const inEditor = useContext(PlasmicCanvasContext);
  return isShown || (inEditor && showInEditor) ? (
    <div className={className}>{children}</div>
  ) : null;
}

export const navMenu: ComponentMeta<ComponentProps<typeof NavMenu>> = {
  name: "hostless-plasmic-nav-menu",
  displayName: "Nav Menu",
  importName: "NavMenu",
  importPath: "@plasmicpkgs/plasmic-nav",
  parentComponentName: "NavProvider",
  props: {
    showInEditor: {
      type: "boolean",
      defaultValue: true,
      description: "Force open the menu when in the Plasmic editor.",
      displayName: "Show in editor",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          tag: "a",
          value: "Home",
          attrs: {
            href: "https://www.plasmic.app",
          },
        },
        {
          type: "text",
          tag: "a",
          value: "About",
          attrs: {
            href: "https://www.plasmic.app",
          },
        },
        {
          type: "text",
          tag: "a",
          value: "Contact",
          attrs: {
            href: "https://www.plasmic.app",
          },
        },
      ],
    },
  },
};

export function registerNavMenu(
  loader?: { registerComponent: typeof registerComponent },
  customNavMenu?: ComponentMeta<ComponentProps<typeof NavMenu>>
) {
  if (loader) {
    loader.registerComponent(NavMenu, customNavMenu ?? navMenu);
  } else {
    registerComponent(NavMenu, customNavMenu ?? navMenu);
  }
}

export function NavToggle({
  className,
  show,
  hide,
}: {
  className?: string;
  show: React.ReactNode;
  hide: React.ReactNode;
}) {
  const { toggleNav, isShown } = useNavContext("NavToggle");
  return (
    <button className={className} onClick={toggleNav}>
      {isShown ? hide : show}
    </button>
  );
}

export const navToggle: ComponentMeta<ComponentProps<typeof NavToggle>> = {
  name: "hostless-plasmic-nav-toggle",
  displayName: "Nav Toggle",
  importName: "NavToggle",
  importPath: "@plasmicpkgs/plasmic-nav",
  parentComponentName: "NavProvider",
  props: {
    show: {
      type: "slot",
      defaultValue: {
        type: "img",
        src: "https://static1.plasmic.app/menu.svg",
      },
    },
    hide: {
      type: "slot",
      defaultValue: {
        type: "img",
        src: "https://static1.plasmic.app/close.svg",
      },
    },
  },
  defaultStyles: {
    padding: 0,
    border: "0px none rgba(0,0,0,0)",
    background: "rgba(0,0,0,0)",
  },
};

export function registerNavToggle(
  loader?: { registerComponent: typeof registerComponent },
  customNavToggle?: ComponentMeta<ComponentProps<typeof NavToggle>>
) {
  if (loader) {
    loader.registerComponent(NavToggle, customNavToggle ?? navToggle);
  } else {
    registerComponent(NavToggle, customNavToggle ?? navToggle);
  }
}
