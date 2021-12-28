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

export function NavContainer({
  previewOpen = false,
  children,
}: {
  previewOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isShown, setShown] = useState(false);
  const inEditor = useContext(PlasmicCanvasContext);
  return (
    <NavContext.Provider
      value={{
        isShown: isShown || (inEditor && previewOpen),
        toggleNav: () => setShown(!isShown),
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export const navContainer: ComponentMeta<
  ComponentProps<typeof NavContainer>
> = {
  name: "hostless-plasmic-nav-container",
  displayName: "Nav Container",
  importName: "NavContainer",
  importPath: "@plasmicpkgs/plasmic-nav",
  props: {
    children: "slot",
  },
};

export function registerNavContainer(
  loader?: { registerComponent: typeof registerComponent },
  customNavContainer?: ComponentMeta<ComponentProps<typeof NavContainer>>
) {
  if (loader) {
    loader.registerComponent(NavContainer, customNavContainer ?? navContainer);
  } else {
    registerComponent(NavContainer, customNavContainer ?? navContainer);
  }
}

export function NavMenu({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isShown } = useNavContext("NavMenu");
  return isShown ? <div className={className}>{children}</div> : null;
}

export const navMenu: ComponentMeta<ComponentProps<typeof NavMenu>> = {
  name: "hostless-plasmic-nav-container",
  displayName: "Nav Container",
  importName: "NavMenu",
  importPath: "@plasmicpkgs/plasmic-nav",
  props: {
    children: "slot",
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
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { toggleNav } = useNavContext("NavToggle");
  return (
    <button className={className} onClick={toggleNav}>
      {children}
    </button>
  );
}

export const navToggle: ComponentMeta<ComponentProps<typeof NavToggle>> = {
  name: "hostless-plasmic-nav-container",
  displayName: "Nav Container",
  importName: "NavToggle",
  importPath: "@plasmicpkgs/plasmic-nav",
  props: {
    children: "slot",
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
