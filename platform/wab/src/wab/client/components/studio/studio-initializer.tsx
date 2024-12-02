import { storageViewAsKey } from "@/wab/client/app-auth/constants";
import { AppCtx } from "@/wab/client/app-ctx";
import { isHostFrame, UU } from "@/wab/client/cli-routes";
import { syncCodeComponentsAndHandleErrors } from "@/wab/client/code-components/code-components";
import importAndRetry from "@/wab/client/components/dynamic-import";
import {
  PreviewCtx,
  providesPreviewCtx,
} from "@/wab/client/components/live/PreviewCtx";
import { Studio } from "@/wab/client/components/studio/studio";
import { ViewEditor } from "@/wab/client/components/studio/view-editor";
import * as widgets from "@/wab/client/components/widgets";
import { AlertSpec } from "@/wab/client/components/widgets/plasmic/AlertBanner";
import { providesViewCtx } from "@/wab/client/contexts/StudioContexts";
import { HostFrameCtx } from "@/wab/client/frame-ctx/host-frame-ctx";
import { checkRootSubHostVersion } from "@/wab/client/frame-ctx/windows";
import { initStudioCtx } from "@/wab/client/init-view-ctx";
import "@/wab/client/react-global-hook/globalHook"; // Run once studio loads to inject our hook
import { initializePlasmicExtension } from "@/wab/client/screenshot-util";
import {
  providesStudioCtx,
  StudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { initBuiltinActions } from "@/wab/shared/core/states";
import { PLEXUS_STORAGE_KEY } from "@/wab/shared/insertables";
import { makeGlobalObservable } from "@/wab/shared/mobx-util";
import { notification } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { Helmet } from "react-helmet";
import { Route, Switch } from "react-router";

type StudioInitializerProps = {
  projectId: string;
  hostFrameCtx: HostFrameCtx;
  appCtx: AppCtx;
  onRefreshUi: () => void;
};
type StudioInitializerState = {
  studioCtx: StudioCtx | undefined;
};
class StudioInitializer_ extends React.Component<
  StudioInitializerProps,
  StudioInitializerState
> {
  _cleanups;
  constructor(props) {
    super(props);
    this._cleanups = [];
    this.state = {
      studioCtx: undefined,
    };
  }
  componentWillUnmount() {
    // TODO: this code never actually gets to run, because the containing
    // app host iframe is violently removed from the DOM and React did
    // not get a chance to unmount. Even window.onbeforeunload does not work.
    const studioCtx = this.state.studioCtx;
    if (studioCtx) {
      studioCtx.dispose();
      const previewCtx = studioCtx.previewCtx;
      if (previewCtx) {
        previewCtx.dispose();
      }
    }
    this._cleanups.forEach((cleanup) => cleanup());
  }

  init = async () => {
    initializePlasmicExtension();
    const { hostFrameCtx, appCtx, onRefreshUi, projectId } = this.props;

    const plexusStorageKey = `${PLEXUS_STORAGE_KEY}.${projectId}`;
    const plexusInStorage = await appCtx.api.getStorageItem(plexusStorageKey);
    if (plexusInStorage) {
      // The user has already opted into/out of Plexus
      appCtx.appConfig.plexus = plexusInStorage === "true";
    } else if (appCtx.appConfig.plexus) {
      // The user wants to opt into Plexus either because:
      // 1. Plasmic core team member
      // 2. plexus=true in query param

      // Store preference in local storage
      spawn(
        appCtx.api.addStorageItem(plexusStorageKey, appCtx.appConfig.plexus)
      );
    }

    if (appCtx.appConfig.incrementalObservables) {
      makeGlobalObservable();
    }
    const studioCtx = await initStudioCtx(appCtx, projectId, onRefreshUi);
    const previewCtx = new PreviewCtx(hostFrameCtx, studioCtx);

    spawn(studioCtx.startListeningForSocketEvents());

    if (!appCtx.selfInfo) {
      studioCtx.alertBannerState.set(AlertSpec.Unlogged);
      studioCtx.blockChanges = true;
    } else if (!studioCtx.canEditProject()) {
      studioCtx.alertBannerState.set(AlertSpec.ReadOnly);
      studioCtx.blockChanges = true;
    } else if (!studioCtx.canEditBranch()) {
      studioCtx.alertBannerState.set(AlertSpec.ProtectedMainBranch);
      studioCtx.blockChanges = true;
    }

    initBuiltinActions({
      projectId: studioCtx.siteInfo.id,
      platform: "react",
      projectFlags: studioCtx.projectFlags(),
      inStudio: true,
    });

    this.setState({ studioCtx });

    const listener = (e: BeforeUnloadEvent) => {
      if (studioCtx.needsSaving()) {
        e.preventDefault();
        e.returnValue = "Changes you made may not be saved.";
      }
    };
    window.addEventListener("beforeunload", listener);
    this._cleanups.push(() =>
      window.removeEventListener("beforeunload", listener)
    );

    studioCtx.finishedLoading();

    if (!appCtx.appConfig.ccStubs && !isHostLessPackage(studioCtx.site)) {
      //ensure plume is available
      await studioCtx.projectDependencyManager.refreshDeps();
      await syncCodeComponentsAndHandleErrors(studioCtx);
    }

    spawn(studioCtx.maybeShowGlobalContextNotificationForStarters());
    checkRootSubHostVersion();

    if (studioCtx.siteInfo.hasAppAuth) {
      const lastLoggedInAppUser = await appCtx.api.getStorageItem(
        storageViewAsKey(studioCtx.siteInfo.id)
      );

      if (lastLoggedInAppUser) {
        const parsedLoggedInUser = JSON.parse(lastLoggedInAppUser);
        if (parsedLoggedInUser) {
          const { studioAppUser } = parsedLoggedInUser;
          await studioCtx.logAsAppUser(studioAppUser);
        }
      } else {
        // Wrap in try/catch to avoid triggering error in studio initialization
        // and blocking the user from using the studio.
        try {
          const { initialUser } = await appCtx.api.getInitialUserToViewAs(
            studioCtx.siteInfo.id
          );
          if (initialUser) {
            // Save the user in local storage so that we don't have to ask the server again
            // if the user reloads the page.
            await appCtx.api.addStorageItem(
              storageViewAsKey(studioCtx.siteInfo.id),
              JSON.stringify({
                studioAppUser: initialUser,
              })
            );
            await studioCtx.logAsAppUser(initialUser);
          } else {
            // Saving null here will block the request to the server next time the user loads the page,
            // but that may be unintended behavior, as it means that currently there is no registered
            // email in the access list. So we only save something to localStorage if we have a user
            // email in the access list or if at any point the user intentionally logged in as a user.
          }
        } catch (e) {
          reportError(e);
        }
      }
    }

    return { studioCtx, previewCtx };
  };

  hideStudio() {
    return <style>{`.studio { visibility: hidden; }`}</style>;
  }

  render() {
    if (!isHostFrame()) {
      notification.error({
        message: "Unknown URL",
        description: "Please make sure you are accessing a valid URL",
        duration: 0,
      });
      return null;
    }

    const contents = ({
      previewCtx,
      studioCtx,
    }: {
      previewCtx: PreviewCtx;
      studioCtx: StudioCtx;
    }) => {
      const viewCtx = studioCtx.focusedViewCtx();
      const isFullPreviewMode = previewCtx.full && previewCtx.isLive;
      console.log("Rendering Studio", {
        viewCtx,
        full: previewCtx.full,
        isLive: previewCtx.isLive,
      });
      return providesStudioCtx(studioCtx)(
        providesViewCtx(viewCtx)(
          providesPreviewCtx(previewCtx)(
            <>
              {!isFullPreviewMode && (
                <Studio studioCtx={studioCtx}>
                  <ViewEditor
                    viewCtx={viewCtx}
                    studioCtx={studioCtx}
                    previewCtx={previewCtx}
                  />
                </Studio>
              )}
              <Switch>
                <Route
                  exact
                  path={[
                    UU.project.pattern,
                    UU.projectSlug.pattern,
                    UU.projectBranchArena.pattern,
                  ]}
                  render={() => {
                    return (
                      // @ts-expect-error
                      <Helmet>
                        <body className="no-text-select" />
                      </Helmet>
                    );
                  }}
                />
                <Route
                  path={UU.projectDocs.pattern}
                  render={() => (
                    <>
                      {this.hideStudio()}
                      <widgets.ObserverLoadable
                        loader={() =>
                          importAndRetry(
                            () =>
                              import("@/wab/client/components/docs/DocsPortal")
                          ).then(({ default: DocsPortal }) => DocsPortal)
                        }
                        contents={(DocsPortal) => (
                          <DocsPortal
                            hostFrameCtx={previewCtx.hostFrameCtx}
                            studioCtx={studioCtx}
                          />
                        )}
                      />
                    </>
                  )}
                />
                <Route
                  path={[
                    UU.projectPreview.pattern,
                    UU.projectFullPreview.pattern,
                  ]}
                  render={() => {
                    return (
                      <>
                        {this.hideStudio()}
                        <widgets.ObserverLoadable
                          loader={() =>
                            importAndRetry(
                              () =>
                                import("@/wab/client/components/live/Preview")
                            ).then(({ default: Preview }) => Preview)
                          }
                          contents={(Preview) => (
                            <Preview studioCtx={studioCtx} />
                          )}
                        />
                      </>
                    );
                  }}
                />
              </Switch>
            </>
          )
        )
      );
    };
    return (
      <widgets.ObserverLoadable
        loader={this.init}
        contents={contents}
        loadingContents={() => <widgets.StudioPlaceholder />}
      />
    );
  }
}
export const StudioInitializer = observer(StudioInitializer_);
