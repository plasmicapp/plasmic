import {
  PlasmicDataSourceContextProvider,
  PlasmicDataSourceContextValue,
} from "@plasmicapp/data-sources-context";
import {
  DataProvider,
  PlasmicI18NContextValue,
  PlasmicLinkProvider,
  PlasmicTranslator,
} from "@plasmicapp/host";
import { SSRProvider, useIsSSR as useAriaIsSSR } from "@react-aria/ssr";
import * as React from "react";
import { PlasmicHeadContext } from "./PlasmicHead";
import { PlasmicLinkInternal } from "./PlasmicLink";
import { PlasmicTranslatorContext } from "./translation";
export {
  PlasmicDataSourceContextProvider,
  useCurrentUser,
} from "@plasmicapp/data-sources-context";
// import { PlasmicLink } from "./PlasmicLink";

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
  Link?: React.ComponentType<any>;
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
      wrapper={(children_) => (
        <DataProvider
          name="plasmicInternalEnableLoadingBoundary"
          hidden
          data={true}
        >
          <React.Suspense fallback={suspenseFallback ?? "Loading..."}>
            {children_}
          </React.Suspense>
        </DataProvider>
      )}
    >
      <PlasmicRootContext.Provider value={context}>
        <MaybeWrap
          cond={reactMajorVersion < 18}
          wrapper={(children_) => <SSRProvider>{children_}</SSRProvider>}
        >
          <PlasmicDataSourceContextProvider value={dataSourceContextValue}>
            <PlasmicTranslatorContext.Provider
              value={props.i18n ?? props.translator}
            >
              <PlasmicHeadContext.Provider value={props.Head}>
                <SafePlasmicLinkProvider
                  Link={props.Link ?? PlasmicLinkInternal}
                >
                  {children}
                </SafePlasmicLinkProvider>
              </PlasmicHeadContext.Provider>
            </PlasmicTranslatorContext.Provider>
          </PlasmicDataSourceContextProvider>
        </MaybeWrap>
      </PlasmicRootContext.Provider>
    </MaybeWrap>
  );
}

/**
 * A PlasmicLinkProvider that anticipates PlasmicLinkProvider may not exist yet from
 * @plasmicapp/host if the user is using an older version
 */
function SafePlasmicLinkProvider(
  props: React.ComponentProps<typeof PlasmicLinkProvider>
) {
  if (PlasmicLinkProvider) {
    return <PlasmicLinkProvider {...props} />;
  } else {
    return <>{props.children}</>;
  }
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
