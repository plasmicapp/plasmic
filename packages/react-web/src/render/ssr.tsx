import {
  PlasmicDataSourceContextProvider,
  PlasmicDataSourceContextValue,
} from "@plasmicapp/data-sources-context";
import { SSRProvider, useIsSSR as useAriaIsSSR } from "@react-aria/ssr";
import * as React from "react";
import { PlasmicHeadContext } from "./PlasmicHead";
import {
  PlasmicI18NContextValue,
  PlasmicTranslator,
  PlasmicTranslatorContext,
} from "./translation";
export {
  PlasmicDataSourceContextProvider,
  useCurrentUser,
} from "@plasmicapp/data-sources-context";
import { DataProvider } from "@plasmicapp/host";

export interface PlasmicRootContextValue {
  platform?: "nextjs" | "gatsby";
}

const PlasmicRootContext = React.createContext<
  PlasmicRootContextValue | undefined
>(undefined);

export interface PlasmicRootProviderProps
  extends PlasmicDataSourceContextValue {
  platform?: "nextjs" | "gatsby";
  children?: React.ReactNode;
  i18n?: PlasmicI18NContextValue;
  /**
   * @deprecated use i18n.translator instead
   */
  translator?: PlasmicTranslator;
  Head?: React.ComponentType<any>;
  disableLoadingBoundary?: boolean;
  suspenseFallback?: React.ReactNode;
}

export function PlasmicRootProvider(props: PlasmicRootProviderProps) {
  const {
    platform,
    children,
    userAuthToken,
    isUserLoading,
    authRedirectUri,
    user,
    disableLoadingBoundary,
    suspenseFallback,
    i18n,
  } = props;
  const context = React.useMemo(
    () => ({
      platform,
    }),
    [platform]
  );
  const dataSourceContextValue = React.useMemo(
    () => ({
      userAuthToken,
      user,
      isUserLoading,
      authRedirectUri,
    }),
    [userAuthToken, isUserLoading, user, authRedirectUri]
  );
  const reactMajorVersion = +React.version.split(".")[0];

  return (
    <MaybeWrap
      cond={!disableLoadingBoundary && reactMajorVersion >= 18}
      wrapper={(children) => (
        <DataProvider
          name="plasmicInternalEnableLoadingBoundary"
          hidden
          data={true}
        >
          <React.Suspense fallback={suspenseFallback ?? "Loading..."}>
            {children}
          </React.Suspense>
        </DataProvider>
      )}
    >
      <PlasmicRootContext.Provider value={context}>
        <SSRProvider>
          <PlasmicDataSourceContextProvider value={dataSourceContextValue}>
            <PlasmicTranslatorContext.Provider
              value={props.i18n ?? props.translator}
            >
              <PlasmicHeadContext.Provider value={props.Head}>
                {children}
              </PlasmicHeadContext.Provider>
            </PlasmicTranslatorContext.Provider>
          </PlasmicDataSourceContextProvider>
        </SSRProvider>
      </PlasmicRootContext.Provider>
    </MaybeWrap>
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

function MaybeWrap(props: {
  children: React.ReactElement;
  cond: boolean;
  wrapper: (children: React.ReactElement) => React.ReactElement;
}) {
  return props.cond ? props.wrapper(props.children) : props.children;
}
