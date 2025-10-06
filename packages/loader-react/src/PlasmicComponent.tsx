import * as React from "react";
import { usePlasmicRootContext } from "./PlasmicRootProvider";
import { usePlasmicComponent } from "./usePlasmicComponent";
import { MaybeWrap } from "./utils";

const PlasmicComponentContext = React.createContext(false);

export function PlasmicComponent(props: {
  /**
   * Name of the component to render, or the path of the page component
   */
  component: string;
  /**
   * Optionally specify a projectId if there are multiple components
   * of the same name from different projects
   */
  projectId?: string;
  /**
   * If you used registerComponent(), then if the name matches a registered
   * component, that component is used.  If you want the Plasmic-generated
   * component instead, specify forceOriginal.
   */
  forceOriginal?: boolean;
  componentProps?: any;
}): React.ReactElement | null {
  const { component, projectId, componentProps, forceOriginal } = props;

  const rootContext = usePlasmicRootContext();
  const isRootLoader = !React.useContext(PlasmicComponentContext);

  if (!rootContext) {
    // no existing PlasmicRootProvider
    throw new Error(
      `You must use <PlasmicRootProvider/> at the root of your app`
    );
  }

  const {
    loader,
    globalContextsProps,
    variation,
    userAuthToken,
    isUserLoading,
    authRedirectUri,
    translator,
    ...rest
  } = rootContext;

  const Component = usePlasmicComponent(
    { name: component, projectId, isCode: false },
    { forceOriginal }
  );

  React.useEffect(() => {
    if (isRootLoader) {
      const meta = loader
        .getLookup()
        .getComponentMeta({ name: component, projectId });

      if (meta) {
        loader.trackRender({
          renderCtx: {
            rootProjectId: meta.projectId,
            rootComponentId: meta.id,
            rootComponentName: component,
            teamIds: loader.getTeamIds(),
            projectIds: loader.getProjectIds(),
          },
          variation,
        });
      }
    }
  }, [component, projectId, loader, variation]);

  const element = React.useMemo(() => {
    if (!Component) {
      return null;
    }

    let elt = <Component {...componentProps} />;

    if (isRootLoader) {
      // If this is the root PlasmicComponent, then wrap the content with the
      // react-web's PlasmicRootProvider.  We are doing this here, instead of
      // say PlasmicRootProvider, because we don't have access to this context
      // provider until data has been loaded.  If we insert this provider into
      // the tree at the root after data is loaded, then we'll invalidate the
      // React tree and tree state, which is bad.  Instead, we do it at the
      // "root-most PlasmicComponent"; we won't risk invalidating the sub-tree
      // here because there were no children before the data came in.
      const lookup = loader.getLookup();
      const ReactWebRootProvider = lookup.getRootProvider();
      const StyleTokensProvider = lookup.maybeGetStyleTokensProvider(
        {
          name: component,
          projectId,
        },
        rootContext.styleTokenOverridesProjectId
      );
      const GlobalContextsProvider = lookup.getGlobalContextsProvider({
        name: component,
        projectId,
      });
      elt = (
        <ReactWebRootProvider
          {...rest}
          userAuthToken={userAuthToken}
          isUserLoading={isUserLoading}
          authRedirectUri={authRedirectUri}
          i18n={{
            translator,
            tagPrefix: loader.opts.i18n?.tagPrefix,
          }}
        >
          <MaybeWrap
            cond={!!GlobalContextsProvider}
            wrapper={(children) => (
              <GlobalContextsProvider {...globalContextsProps}>
                {children}
              </GlobalContextsProvider>
            )}
          >
            <MaybeWrap
              cond={!!StyleTokensProvider}
              wrapper={(children) => (
                <StyleTokensProvider>{children}</StyleTokensProvider>
              )}
            >
              <PlasmicComponentContext.Provider value={true}>
                {elt}
              </PlasmicComponentContext.Provider>
            </MaybeWrap>
          </MaybeWrap>
        </ReactWebRootProvider>
      );
    }
    return elt;
  }, [
    Component,
    componentProps,
    loader,
    isRootLoader,
    component,
    projectId,
    globalContextsProps,
    userAuthToken, // Just use the token to memo, `user` should be derived from it
    isUserLoading,
    authRedirectUri,
  ]);
  return element;
}
