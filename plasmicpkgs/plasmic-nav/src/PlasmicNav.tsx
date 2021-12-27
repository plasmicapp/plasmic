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

export const useNavContext = () => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error(
      "NavToggle can only be instantiated somewhere inside a NavContainer"
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

export function NavMenu({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isShown } = useNavContext();
  return isShown && <div className={className}>{children}</div>;
}

export function NavToggle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { toggleNav } = useNavContext();
  return (
    <button className={className} onClick={toggleNav}>
      {children}
    </button>
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
