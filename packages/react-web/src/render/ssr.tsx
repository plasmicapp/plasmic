import * as React from "react";
import { SSRProvider, useIsSSR as useAriaIsSSR } from "react-aria";

export interface PlasmicRootContextValue {
  platform?: "nextjs" | "gatsby";
}

const PlasmicRootContext = React.createContext<
  PlasmicRootContextValue | undefined
>(undefined);

export interface PlasmicRootProviderProps {
  platform?: "nextjs" | "gatsby";
  children?: React.ReactNode;
}

export function PlasmicRootProvider(props: PlasmicRootProviderProps) {
  const { platform, children } = props;
  const context = React.useMemo(
    () => ({
      platform,
    }),
    [platform]
  );
  return (
    <PlasmicRootContext.Provider value={context}>
      <SSRProvider>{children}</SSRProvider>
    </PlasmicRootContext.Provider>
  );
}

export const useIsSSR = useAriaIsSSR;

export function useHasPlasmicRoot() {
  return !!React.useContext(PlasmicRootContext);
}

let hasWarnedSSR = false;
/**
 * Warns the user if PlasmicRootProvider is not used
 */
export function useEnsureSSRProvider() {
  const hasRoot = useHasPlasmicRoot();
  if (hasRoot || hasWarnedSSR || process.env.NODE_ENV !== "development") {
    return;
  }

  hasWarnedSSR = true;
  console.warn(
    `Plasmic: To ensure your components work correctly with server-side rendering, please use PlasmicRootProvider at the root of your application.  See https://docs.plasmic.app/learn/ssr`
  );
}
