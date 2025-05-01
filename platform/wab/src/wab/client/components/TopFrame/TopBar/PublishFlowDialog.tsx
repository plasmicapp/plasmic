import { useGetDomainsForProject } from "@/wab/client/api-hooks";
import { AppCtx } from "@/wab/client/app-ctx";
import {
  SiteDiffs,
  SplitStatusUpdateSummarySection,
} from "@/wab/client/components/modals/SiteDiffs";
import {
  SetupPlasmicHosting,
  StatusPlasmicHosting,
} from "@/wab/client/components/TopFrame/TopBar/SubsectionPlasmicHosting";
import {
  SetupPushDeploy,
  StatusPushDeploy,
} from "@/wab/client/components/TopFrame/TopBar/SubsectionPushDeploy";
import {
  SetupSaveVersion,
  StatusSaveVersion,
} from "@/wab/client/components/TopFrame/TopBar/SubsectionSaveVersion";
import {
  SetupWebhooks,
  StatusWebhooks,
} from "@/wab/client/components/TopFrame/TopBar/SubsectionWebhooks";
import { topFrameTourSignals } from "@/wab/client/components/TopFrame/TopFrameChrome";
import { replaceLink } from "@/wab/client/components/view-common";
import { Spinner } from "@/wab/client/components/widgets";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import {
  DefaultPublishFlowDialogProps,
  PlasmicPublishFlowDialog,
  PlasmicPublishFlowDialog__VariantMembers,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicPublishFlowDialog";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { ApiBranch, ApiProject } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { prodUrlForProject } from "@/wab/shared/project-urls";
import type {
  ChangeLogEntry,
  SemVerReleaseType,
} from "@/wab/shared/site-diffs";
import { filterUsefulDiffs } from "@/wab/shared/site-diffs/filter-useful-diffs";
import * as React from "react";

export interface VisibleEnableBlockReadOnly {
  visible: boolean;
  enable: boolean;
  block: boolean;
}
export interface VisibleEnableBlock extends VisibleEnableBlockReadOnly {
  setVisibleEnableBlock: (v: boolean, e: boolean, b: boolean) => void;
}

export interface SubsectionMeta {
  saveVersion: VisibleEnableBlock & {
    setup: SetupSaveVersion;
    status?: StatusSaveVersion;
  };
  plasmicHosting: VisibleEnableBlock & {
    setup: SetupPlasmicHosting;
    status?: StatusPlasmicHosting;
  };
  pushDeploy: VisibleEnableBlock & {
    setup: SetupPushDeploy;
    status?: StatusPushDeploy;
  };
  webhooks: VisibleEnableBlock & {
    setup: SetupWebhooks;
    status?: StatusWebhooks;
  };
}

interface PublishFlowDialogProps extends DefaultPublishFlowDialogProps {
  latestPublishedVersionData:
    | { revisionId: string; version: string }
    | undefined;
  appCtx: AppCtx;
  project: ApiProject;
  refreshProjectAndPerms: () => void;
  activatedBranch: ApiBranch | undefined;
  closeDialog: () => void;
  subsectionMeta: SubsectionMeta;
  setView: (
    view: PlasmicPublishFlowDialog__VariantMembers["view"] | undefined
  ) => void;
  publish: () => void;
  resetStatus: () => void;
  setShowCodeModal: (val: boolean) => Promise<void>;
}

function PublishFlowDialog(props: PublishFlowDialogProps) {
  const {
    appCtx,
    project,
    refreshProjectAndPerms,
    activatedBranch,
    latestPublishedVersionData: latestRelease,
    closeDialog,
    subsectionMeta,
    view,
    setView,
    publish,
    resetStatus,
    setShowCodeModal,
    ...rest
  } = props;
  const { hostFrameApi } = useTopFrameCtx();
  const projectId = project.id;
  const isWhiteLabelUser = appCtx.isWhiteLabelUser();

  // Versions
  const [loadingVersion, setLoadingVersion] = React.useState(true);
  const [nextVersion, setNextVersion] = React.useState<{
    version: string;
    releaseType?: SemVerReleaseType;
    changeLog: ChangeLogEntry[];
  }>();
  React.useEffect(() => {
    spawn(
      (async () => {
        if (loadingVersion) {
          const next = await hostFrameApi.calculateNextPublishVersion();
          setNextVersion(next);
          setLoadingVersion(false);
          if (view !== "status") {
            if (next) {
              subsectionMeta.saveVersion.setVisibleEnableBlock(
                true,
                true,
                false
              );
            } else {
              subsectionMeta.saveVersion.setVisibleEnableBlock(
                true,
                false,
                true
              );
            }
          }
        }
      })()
    );
  }, [hostFrameApi, view, loadingVersion]);

  // Push and deploy (Git)
  const projectRepository = subsectionMeta.pushDeploy.setup.projectRepository;

  // Webhooks
  const fetchWebhooks = useAsyncFnStrict(async () => {
    if (activatedBranch) {
      return;
    }
    const response = await appCtx.api.getProjectWebhooks(projectId);
    subsectionMeta.webhooks.setup.updateWebhooks(response.webhooks);
    if (view !== "status") {
      if (subsectionMeta.webhooks.block && response.webhooks.length > 0) {
        subsectionMeta.webhooks.setVisibleEnableBlock(true, true, false);
      } else if (response.webhooks.length === 0) {
        subsectionMeta.webhooks.setVisibleEnableBlock(
          subsectionMeta.webhooks.visible,
          false,
          true
        );
      }
    }
    return response;
  }, [projectId, subsectionMeta, view])[1];
  const webhookEventState = useAsyncStrict(async () => {
    if (view === "webhooksHistory") {
      return await appCtx.api.getProjectWebhookEvents(projectId);
    }
    return undefined;
  }, [view]);

  const diffs = !nextVersion ? null : filterUsefulDiffs(nextVersion.changeLog);

  const { data: plasmicHostingDomains, isLoading: loadingDomains } =
    useGetDomainsForProject(projectId);

  if (loadingDomains) {
    return <Spinner />;
  }

  const prodUrl = prodUrlForProject(
    DEVFLAGS,
    project,
    plasmicHostingDomains?.domains ?? []
  );

  return (
    <>
      <PlasmicPublishFlowDialog
        {...rest}
        projectName={project.name}
        view={view}
        currentVersionNumber={!latestRelease ? "v0.0.1" : latestRelease.version}
        destinationSection={{
          render: (ps, Comp) =>
            prodUrl && (
              <Comp {...ps}>
                <a href={prodUrl} target={"_blank"}>
                  {prodUrl.replace(/^https?:\/\//, "")}
                </a>
              </Comp>
            ),
          props: {},
        }}
        root={{
          id: "publish-flow-dialog-root",
          style: {
            maxHeight: `calc(100vh - 100px)`,
          },
        }}
        cancelButton={{
          onClick: closeDialog,
        }}
        dismissButton={{
          onClick: closeDialog,
        }}
        backButton={{
          onClick: () => setView(undefined),
        }}
        publishButton={{
          disabled:
            loadingVersion ||
            (!subsectionMeta.saveVersion.enable &&
              !subsectionMeta.pushDeploy.enable &&
              !subsectionMeta.webhooks.enable),
          onClick: publish,
          id: "publish-flow-dialog-publish-btn",
          ...(loadingVersion && { children: "Loading..." }),
        }}
        startOverButton={{
          onClick: () => {
            subsectionMeta.webhooks.setup.resetWebhookEnabled();
            resetStatus();
            setView(undefined);
            setLoadingVersion(true);
          },
        }}
        subsectionSaveVersion={{
          project,
          closeDialog: closeDialog,
          changesSummary: (
            <SplitStatusUpdateSummarySection diffs={diffs ?? []} />
          ),
          gotoReviewChanges: () => setView("reviewChanges"),
          loading: loadingVersion,
          version: nextVersion?.version,
          releaseType: nextVersion?.releaseType,
          ...subsectionMeta.saveVersion,
        }}
        subsectionPushDeploy={{
          props: {
            // Important to render the component, since the component is what
            // kicks off the load.
            style: subsectionMeta.pushDeploy.visible ? {} : { display: "none" },
            project,
            appCtx,
            ...subsectionMeta.pushDeploy,
          },
        }}
        subsectionPlasmicHosting={{
          props: {
            // Important to render the component, since the component is what
            // kicks off the load.
            style: subsectionMeta.plasmicHosting.visible
              ? {}
              : { display: "none" },
            project,
            refreshProjectAndPerms,
            appCtx,
            ...subsectionMeta.plasmicHosting,
          },
        }}
        subsectionWebhooks={{
          props: {
            appCtx,
            project,
            // Important to render the component, since the component is what
            // kicks off the loa.
            style: subsectionMeta.webhooks.visible ? {} : { display: "none" },
            fetchWebhooks: () => spawn(fetchWebhooks()),
            webhookEventState,
            onViewHistory: () => setView("webhooksHistory"),
            setShowCodeModal: setShowCodeModal,
            ...subsectionMeta.webhooks,
          },
        }}
        webhooksHistory={{
          props: {
            state: webhookEventState,
          },
        }}
        container={{
          render: () =>
            !diffs ? null : (
              <div>
                <SiteDiffs diffs={diffs} />
              </div>
            ),
        }}
        addWebhooksButton={{
          withIcons: "startIcon",
          onClick: () =>
            subsectionMeta.webhooks.setVisibleEnableBlock(true, true, true),
        }}
        webhooksDescription={{
          render: (_props) =>
            replaceLink(_props, (text) => (
              <a
                href="javascript: void 0"
                onClick={() => spawn(setShowCodeModal(true))}
              >
                {text}
              </a>
            )),
        }}
        addWebhooksPanel={{
          wrap: (node) => !subsectionMeta.webhooks.visible && node,
        }}
        addGithubButton={{
          withIcons: "startIcon",
          onClick: () =>
            subsectionMeta.pushDeploy.setVisibleEnableBlock(true, false, true),
        }}
        addGithubPanel={{
          wrap: (node) =>
            !subsectionMeta.pushDeploy.visible && !isWhiteLabelUser && node,
        }}
        addWebsiteButton={{
          id: "publish-flow-dialog-add-website-btn",
          withIcons: "startIcon",
          onClick: () => {
            topFrameTourSignals.dispatch({
              type: TutorialEventsType.AddWebsiteButtonClicked,
            });
            subsectionMeta.plasmicHosting.setVisibleEnableBlock(
              true,
              false, // We don't have any domains set yet, so the action is disabled
              true
            );
          },
        }}
        addWebsitePanel={{
          wrap: (node) =>
            appCtx.appConfig.enablePlasmicHosting &&
            !subsectionMeta.plasmicHosting.visible &&
            !isWhiteLabelUser &&
            node,
          props: {
            id: "publish-flow-dialog-add-website-panel",
          },
        }}
        addActionsContainer={{
          wrap: (node) =>
            !activatedBranch &&
            (!subsectionMeta.pushDeploy.visible ||
              !subsectionMeta.webhooks.visible ||
              !subsectionMeta.plasmicHosting.visible) &&
            node,
        }}
        statusButton={{
          onClick: () => setView("status"),
        }}
      />
    </>
  );
}

export default PublishFlowDialog;
