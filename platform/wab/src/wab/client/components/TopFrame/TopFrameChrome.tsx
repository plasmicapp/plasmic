import { AppCtx } from "@/wab/client/app-ctx";
import { isPlasmicPath, U, UU } from "@/wab/client/cli-routes";
import { AppAuthSettingsModal } from "@/wab/client/components/app-auth/AppAuthSettings";
import { HostConfig } from "@/wab/client/components/HostConfig";
import { MergeModalWrapper } from "@/wab/client/components/merge/MergeFlow";
import { EnableLocalizationModal } from "@/wab/client/components/modals/EnableLocalizationModal";
import { TopBarPromptBillingArgs } from "@/wab/client/components/modals/PricingModal";
import { DataSourcePicker } from "@/wab/client/components/TopFrame/DataSourcePicker";
import CloneProjectModal from "@/wab/client/components/TopFrame/TopBar/CloneProjectModal";
import CodeModal from "@/wab/client/components/TopFrame/TopBar/CodeModal";
import ProjectNameModal from "@/wab/client/components/TopFrame/TopBar/ProjectNameModal";
import PublishFlowDialogWrapper from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialogWrapper";
import { showRegenerateSecretTokenModal } from "@/wab/client/components/TopFrame/TopBar/RegenerateSecretTokenModal";
import ShareModal from "@/wab/client/components/TopFrame/TopBar/ShareModal";
import UpsellModal from "@/wab/client/components/TopFrame/TopBar/UpsellModal";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import {
  TopFrameApi,
  TopFrameApiArgs,
  TopFrameApiResolveType,
  TopFrameApiReturnType,
} from "@/wab/client/frame-ctx/top-frame-api";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { Shortcut } from "@/wab/client/shortcuts/shortcut";
import { useBindShortcutHandlers } from "@/wab/client/shortcuts/shortcut-handler";
import {
  StudioShortcutAction,
  STUDIO_SHORTCUTS,
} from "@/wab/client/shortcuts/studio/studio-shortcuts";
import {
  TopFrameTours,
  TopFrameTourState,
} from "@/wab/client/tours/tutorials/TutorialTours";
import { assert, asyncWrapper, mkUuid, spawn } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import {
  ApiBranch,
  ApiPermission,
  ApiProject,
  MergeSrcDst,
} from "@/wab/shared/ApiSchema";
import { isCoreTeamEmail } from "@/wab/shared/devflag-utils";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { message, notification } from "antd";
import { Action, Location } from "history";
import { ExtendedKeyboardEvent } from "mousetrap";
import React from "react";
import { useHistory, useLocation } from "react-router";
import * as Signals from "signals";

export interface MergeModalContext {
  subject: MergeSrcDst;
}

export interface TopFrameChromeProps {
  appCtx: AppCtx;
  project: ApiProject;
  refreshProjectAndPerms: () => void;
  isRefreshingProjectData: boolean;
  pathname: string;
  editorPerm: boolean;
  perms: ApiPermission[];
  refreshStudio: () => Promise<void>;
  topFrameApi: TopFrameApi;

  latestPublishedVersionData:
    | { revisionId: string; version: string }
    | undefined;
  revisionNum: number;
  noComponents: boolean;
  isLocalizationEnabled: boolean;
  showPublishModal: boolean;
  keepPublishModalOpen: boolean;
  mergeModalContext: MergeModalContext | undefined;
  showShareModal: boolean;
  showCodeModal: boolean;
  showProjectNameModal: boolean;
  showCloneProjectModal: boolean;
  showHostModal: boolean;
  showLocalizationModal: boolean;
  showUpsellForm: TopBarPromptBillingArgs | undefined;
  setShowUpsellForm: (_: undefined) => void;
  showAppAuthModal: boolean;
  subjectComponentInfo:
    | {
        pathOrComponent: string;
        componentName: string;
      }
    | undefined;
  activatedBranch: ApiBranch | undefined;
  dataSourcePicker:
    | {
        args: TopFrameApiArgs<"pickDataSource">;
        resolve: TopFrameApiResolveType<"pickDataSource">;
      }
    | undefined;
  defaultPageRoleId: string | null | undefined;
  setDefaultPageRoleId: (roleId: string | null | undefined) => void;
  onboardingTour: TopFrameTourState;
  refreshBranchData: () => void;
  shouldShowRegenerateSecretTokenModal: boolean;
  didShowRegenerateSecretTokenModal: () => void;
}

export const topFrameTourSignals = new Signals.Signal();

export function TopFrameChrome({
  appCtx,
  project,
  refreshProjectAndPerms,
  isRefreshingProjectData,
  pathname,
  editorPerm,
  perms,
  refreshStudio,
  topFrameApi,
  refreshBranchData,
  shouldShowRegenerateSecretTokenModal,
  didShowRegenerateSecretTokenModal,
  ...rest
}: TopFrameChromeProps) {
  const location = useLocation();
  const fullPreview = !!UU.projectFullPreview.parse(location.pathname, false);

  React.useEffect(() => {
    document.title = `${project.name} - Plasmic`;
  }, [project.name]);

  React.useEffect(() => {
    if (shouldShowRegenerateSecretTokenModal) {
      spawn(
        showRegenerateSecretTokenModal({
          appCtx,
          project,
        })
      );
      didShowRegenerateSecretTokenModal();
    }
  }, [
    appCtx,
    project,
    shouldShowRegenerateSecretTokenModal,
    showRegenerateSecretTokenModal,
    didShowRegenerateSecretTokenModal,
  ]);

  React.useEffect(() => {
    if (fullPreview && appCtx.appConfig.showFullPreviewWarning) {
      const accessLevel = getAccessLevelToResource(
        { type: "project", resource: project },
        appCtx.selfInfo,
        perms
      );

      const key = mkUuid();

      // Don't show it to the project owner or for projects created by @plasmic.app users
      if (
        accessLevel !== "owner" &&
        perms.every(
          (perm) =>
            perm.accessLevel !== "owner" ||
            !isCoreTeamEmail(perm.email, appCtx.appConfig)
        )
      ) {
        spawn(
          message.open({
            key,
            content: (
              <div className="rel fill-width" style={{ maxWidth: 400 }}>
                <IconButton
                  style={{ position: "absolute", right: 0, top: 0 }}
                  onClick={() => message.destroy(key)}
                >
                  <CloseIcon />
                </IconButton>
                <big>
                  You are previewing a page built in Plasmic <br />
                  <br />
                </big>
                <p style={{ textAlign: "left" }}>
                  Click{" "}
                  <a
                    href={U.project({ projectId: project.id })}
                    target="_blank"
                  >
                    here
                  </a>{" "}
                  to open the project in the Studio.
                  <br />
                  <strong>Important</strong>: Notice this page might include and
                  run third-party javascript, so be careful to not provide
                  personal information or credentials while using it.
                </p>
              </div>
            ),
            duration: 0,
            icon: [],
            type: "info",
          })
        );
        return () => notification.close(key);
      }
    }
    return () => {};
  }, [fullPreview, appCtx, perms]);

  return (
    <>
      {!fullPreview &&
        (UU.projectDocs.parse(pathname, false) ? null : (
          <>
            <ProjectNameModal
              project={project}
              refreshProjectAndPerms={refreshProjectAndPerms}
              showProjectNameModal={rest.showProjectNameModal}
              setShowProjectNameModal={topFrameApi.setShowProjectNameModal}
            />
            <CloneProjectModal
              project={project}
              showCloneProjectModal={rest.showCloneProjectModal}
              setShowCloneProjectModal={topFrameApi.setShowCloneProjectModal}
            />
            {rest.showHostModal && (
              <HostConfig
                appCtx={appCtx}
                project={project}
                onCancel={() => {
                  spawn(topFrameApi.setShowHostModal(false));
                }}
                isRefreshingProjectData={isRefreshingProjectData}
                onUpdate={async (canSkipRefresh) => {
                  if (!canSkipRefresh) {
                    await refreshStudio();
                  } else {
                    refreshBranchData();
                    refreshProjectAndPerms();
                  }
                }}
              />
            )}
            {rest.showUpsellForm && (
              <UpsellModal
                appCtx={appCtx}
                {...rest.showUpsellForm}
                setShowUpsellForm={rest.setShowUpsellForm}
              />
            )}
            <PublishFlowDialogWrapper
              project={project}
              refreshProjectAndPerms={refreshProjectAndPerms}
              activatedBranch={rest.activatedBranch}
              editorPerm={editorPerm}
              latestPublishedVersionData={rest.latestPublishedVersionData}
              revisionNum={rest.revisionNum}
              showPublishModal={rest.showPublishModal}
              keepPublishModalOpen={rest.keepPublishModalOpen}
              setShowPublishModal={topFrameApi.setShowPublishModal}
              setShowCodeModal={topFrameApi.setShowCodeModal}
            />
            <MergeModalWrapper
              project={project}
              editorPerm={editorPerm}
              latestPublishedVersionData={rest.latestPublishedVersionData}
              revisionNum={rest.revisionNum}
              mergeModalContext={rest.mergeModalContext}
              setMergeModalContext={topFrameApi.setMergeModalContext}
              setShowCodeModal={topFrameApi.setShowCodeModal}
            />
            <ShareModal
              refreshProjectAndPerms={refreshProjectAndPerms}
              project={project}
              perms={perms}
              showShareModal={rest.showShareModal}
              setShowShareModal={topFrameApi.setShowShareModal}
            />
            <CodeModal
              project={project}
              noComponents={rest.noComponents}
              subjectComponentInfo={rest.subjectComponentInfo}
              showCodeModal={rest.showCodeModal}
              setShowCodeModal={topFrameApi.setShowCodeModal}
            />
            {rest.dataSourcePicker && (
              <DataSourcePicker
                {...rest.dataSourcePicker.args}
                onSelected={async (result) => {
                  if (result?.sourceId) {
                    await appCtx.api.allowProjectToDataSource(
                      result.sourceId,
                      project.id
                    );
                  }
                  rest.dataSourcePicker?.resolve(result);
                }}
                onCanceled={() => {
                  // When running Cypress and window is not focused,
                  // clicking a select option inside the dialog closes the dialog.
                  // Suppress this behavior for less painful test development.
                  if (!DEVFLAGS.runningInCypress) {
                    rest.dataSourcePicker?.resolve("CANCELED");
                  }
                }}
                project={project}
              />
            )}
            {rest.showLocalizationModal && (
              <EnableLocalizationModal
                isLocalizationEnabled={rest.isLocalizationEnabled}
                project={project}
                onDone={() => topFrameApi.setShowLocalizationModal(false)}
              />
            )}
            {rest.showAppAuthModal && (
              <AppAuthSettingsModal
                appCtx={appCtx}
                project={project}
                defaultPageRoleId={rest.defaultPageRoleId}
                setDefaultPageRoleId={rest.setDefaultPageRoleId}
                onCancel={() => topFrameApi.setShowAppAuthModal(false)}
              />
            )}
            <React.Suspense fallback={null}>
              <TopFrameTours
                appCtx={appCtx}
                tourState={rest.onboardingTour}
                projectId={project.id}
                topFrameApi={topFrameApi}
                changeTourState={topFrameApi.setOnboardingTour}
              />
            </React.Suspense>
          </>
        ))}
      <ForwardShortcuts />
    </>
  );
}

function ForwardShortcuts() {
  const { hostFrameApi, hostFrameApiReady } = useTopFrameCtx();
  useBindShortcutHandlers(
    document.body,
    STUDIO_SHORTCUTS,
    Object.fromEntries(
      (
        Object.entries(STUDIO_SHORTCUTS) as [StudioShortcutAction, Shortcut][]
      ).map(([action, shortcut]) => [
        action,
        (e: ExtendedKeyboardEvent) => {
          if (!hostFrameApiReady) {
            return;
          }

          if (shortcut.action === "COPY" || shortcut.action === "PASTE") {
            // Unhandled action, just focus on the inner frame so the next
            // events can use the clipboard.
            spawn(hostFrameApi.focusOnWindow());
          } else {
            spawn(
              hostFrameApi.forwardShortcut({
                key: e.key,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                code: e.code,
                keyCode: e.keyCode,
              })
            );
          }
        },
      ])
    )
  );
  return null;
}

export function useTopFrameState({
  forceUpdate,
  toggleAdminMode,
}: {
  forceUpdate: () => void;
  toggleAdminMode: (val: boolean) => Promise<void>;
}) {
  const history = useHistory();

  const [latestPublishedVersionData, setLatestPublishedVersionData] =
    React.useState<{ revisionId: string; version: string }>();
  const [revisionNum, setRevisionNum] = React.useState(0);
  const [showPublishModal, setShowPublishModal] = React.useState(false);
  const [keepPublishModalOpen, setKeepPublishModalOpen] = React.useState(false);
  const [mergeModalContext, setMergeModalContext] = React.useState<
    MergeModalContext | undefined
  >(undefined);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [showCodeModal, setShowCodeModal] = React.useState(false);
  const [showCloneProjectModal, setShowCloneProjectModal] =
    React.useState(false);
  const [showProjectNameModal, setShowProjectNameModal] = React.useState(false);
  const [showHostModal, setShowHostModal] = React.useState(false);
  const [showLocalizationModal, setShowLocalizationModal] =
    React.useState(false);
  const [
    shouldShowRegenerateSecretTokenModal,
    setShouldShowRegenerateSecretTokenModal,
  ] = React.useState(false);
  const didShowRegenerateSecretTokenModal = React.useCallback(
    () => setShouldShowRegenerateSecretTokenModal(false),
    [setShouldShowRegenerateSecretTokenModal]
  );
  const [showUpsellForm, setShowUpsellForm] = React.useState<
    TopBarPromptBillingArgs | undefined
  >(undefined);
  const [showAppAuthModal, setShowAppAuthModal] = React.useState(false);

  const [noComponents, setNoComponents] = React.useState(true);
  const [subjectComponentInfo, setSubjectComponentInfo] = React.useState<{
    pathOrComponent: string;
    componentName: string;
  }>();
  const [activatedBranch, setActivatedBranch] = React.useState<
    ApiBranch | undefined
  >();
  const [isLocalizationEnabled, setIsLocalizationEnabled] =
    React.useState(false);
  const [dataSourcePicker, setDataSourcePicker] = React.useState<{
    args: Parameters<TopFrameApi["pickDataSource"]>[0];
    resolve: (
      result: Awaited<ReturnType<TopFrameApi["pickDataSource"]>>
    ) => void;
  }>();
  const [defaultPageRoleId, setDefaultPageRoleId] = React.useState<
    string | null | undefined
  >();

  const [onboardingTour, setOnboardingTour] = React.useState<TopFrameTourState>(
    {
      run: false,
      tour: "",
      stepIndex: 0,
    }
  );

  const topFrameApi = React.useMemo<TopFrameApi>(
    () => ({
      pushLocation(path, query, hash) {
        validateNewLocation(path, history.location);
        history.push({
          pathname: path,
          search: query,
          hash,
        });
        forceUpdate();
      },
      replaceLocation(path, query, hash) {
        validateNewLocation(path, history.location);
        history.replace({
          pathname: path,
          search: query,
          hash,
        });
        forceUpdate();
      },
      registerLocationListener: (listener) => {
        const historyListener = (location: Location, action: Action) => {
          // copy into a plain object so that Comlink can transfer it
          const locationCopy = { ...location };
          listener(locationCopy, action);
        };
        const unregister = history.listen(historyListener);

        // replace host's initial location
        historyListener(history.location, "REPLACE");

        return unregister;
      },

      setDocumentTitle: async (val: string) => {
        document.title = val;
      },
      setPrimitiveValues: async (vals) => {
        setNoComponents(vals.noComponents);
        setRevisionNum(vals.revisionNum);
        setIsLocalizationEnabled(vals.isLocalizationEnabled);
        setDefaultPageRoleId(vals.defaultPageRoleId);
      },
      setLatestPublishedVersionData: asyncWrapper(
        setLatestPublishedVersionData
      ),
      setSubjectComponentInfo: asyncWrapper(setSubjectComponentInfo),
      setActivatedBranch: asyncWrapper((x) => {
        setActivatedBranch(x);
      }),
      setMergeModalContext: asyncWrapper(setMergeModalContext),
      setShowPublishModal: asyncWrapper(setShowPublishModal),
      setKeepPublishModalOpen: asyncWrapper(setKeepPublishModalOpen),
      setShowShareModal: asyncWrapper(setShowShareModal),
      setShowCodeModal: asyncWrapper(setShowCodeModal),
      setShowProjectNameModal: asyncWrapper(setShowProjectNameModal),
      setShowCloneProjectModal: asyncWrapper(setShowCloneProjectModal),
      setShowHostModal: asyncWrapper(setShowHostModal),
      setShowLocalizationModal: asyncWrapper(setShowLocalizationModal),
      showRegenerateSecretTokenModal: async () =>
        setShouldShowRegenerateSecretTokenModal(true),
      setShowUpsellForm: asyncWrapper(setShowUpsellForm),
      setShowAppAuthModal: asyncWrapper(setShowAppAuthModal),
      setOnboardingTour: asyncWrapper(setOnboardingTour),
      pickDataSource: async (opts) => {
        return new Promise((resolve) => {
          setDataSourcePicker({ args: opts, resolve });
        }).finally(() =>
          setDataSourcePicker(undefined)
        ) as TopFrameApiReturnType<"pickDataSource">;
      },
      toggleAdminMode,
    }),
    []
  );

  return {
    topFrameApi,
    latestPublishedVersionData,
    revisionNum,
    noComponents,
    subjectComponentInfo,
    activatedBranch,
    isLocalizationEnabled,
    dataSourcePicker,
    showPublishModal,
    keepPublishModalOpen,
    mergeModalContext,
    showShareModal,
    showCodeModal,
    showProjectNameModal,
    showCloneProjectModal,
    showHostModal,
    showLocalizationModal,
    showUpsellForm,
    setShowUpsellForm,
    showAppAuthModal,
    defaultPageRoleId,
    setDefaultPageRoleId,
    onboardingTour,
    shouldShowRegenerateSecretTokenModal,
    didShowRegenerateSecretTokenModal,
  };
}

function validateNewLocation(
  path: string | undefined,
  previousLocation: Location
) {
  if (!path) {
    return; // query / hash changes only are okay
  }

  assert(isPlasmicPath(path), `${path} is not Plasmic`);

  // https://app.shortcut.com/plasmic/story/20746/improve-isolation-to-support-arbitrary-code
  if (UU.projectFullPreview.parse(previousLocation.pathname, false)) {
    assert(
      UU.projectFullPreview.parse(path, false),
      "Cannot navigate from full preview mode to outside of it"
    );
  } else {
    assert(
      !UU.projectFullPreview.parse(path, false),
      "Cannot navigate from studio to full preview mode"
    );
  }
}
