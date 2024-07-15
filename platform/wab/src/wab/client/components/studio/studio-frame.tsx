/** @format */

import {
  getLoginRouteWithContinuation,
  parseProjectLocation,
  UU,
} from "@/wab/client/cli-routes";
import HostUrlInput from "@/wab/client/components/HostUrlInput";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { HostLoadTimeoutPrompt } from "@/wab/client/components/TopFrame/HostLoadTimeoutPrompt";
import {
  TopFrameChrome,
  useTopFrameState,
} from "@/wab/client/components/TopFrame/TopFrameChrome";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { reportError } from "@/wab/client/ErrorNotifications";
import { buildPlasmicStudioArgsHash } from "@/wab/client/frame-ctx/plasmic-studio-args";
import { TopFrameCtxProvider } from "@/wab/client/frame-ctx/top-frame-ctx";
import { usePreventDefaultBrowserPinchToZoomBehavior } from "@/wab/client/hooks/usePreventDefaultBrowserPinchToZoomBehavior";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import { getHostUrl } from "@/wab/client/utils/app-hosting-utils";
import { useBrowserNotification } from "@/wab/client/utils/useBrowserNotification";
import { ForbiddenError } from "@/wab/shared/ApiErrors/errors";
import {
  ApiBranch,
  ApiPermission,
  ApiProject,
  MainBranchId,
  ProjectId,
} from "@/wab/shared/ApiSchema";
import { maybeOne, spawn, swallow } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { notification } from "antd";
import Modal from "antd/lib/modal/Modal";
import { Location } from "history";
import moize from "moize";
import * as React from "react";
import { useEffect } from "react";

const whitelistedHosts = [
  "https://studio.plasmic.app",
  "https://plasmic.dev",
  "https://host.plasmic.dev",
  "https://code-components.plasmic.site",
  "https://plasmic.app",
  "https://host.plasmicdev.com",
  "https://staging.plasmic.app",
  "https://staging-host.plasmic.app",

  // RAF POC
  "https://raf-poc.plasmic.site",

  // Hydrogen starter demo for the Hydrogen team
  "https://plasmic-hydrogen-starter-demo.herokuapp.com",

  // Remove when this ticket is done:
  // https://app.shortcut.com/plasmic/story/36383/allow-setting-trusted-host-for-whole-organization
  "https://website-git-benjaminflores-brand-2274-homepage-a-3a7667-scaleai.vercel.app",
];

export function StudioFrame({
  projectId,
  refreshStudio,
}: {
  projectId: string;
  refreshStudio: () => Promise<void>;
}) {
  const appCtx = useAppCtx();
  const forceUpdate = useForceUpdate();
  const [project, setProject] = React.useState<ApiProject>();
  const [branch, setBranch] = React.useState<ApiBranch>();
  const [editorPerm, setEditorPerm] = React.useState(false);
  const [untrustedHost, setUntrustedHost] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [perms, setPerms] = React.useState<ApiPermission[]>([]);
  const [fetchProjectCount, setFetchProjectCount] = React.useState(0);
  const [isRefreshingProjectData, setIsRefreshingProjectData] =
    React.useState(false);
  const refreshProjectAndPerms = React.useCallback(
    () => setFetchProjectCount(fetchProjectCount + 1),
    [fetchProjectCount]
  );
  const toggleAdminMode = React.useCallback(async (newMode: boolean) => {
    await appCtx.api.updateSelfAdminMode({
      adminModeDisabled: newMode,
    });
    await refreshStudio();
  }, []);

  const fetchBranches = React.useCallback(
    moize(
      async () =>
        (await appCtx.api.listBranchesForProject(projectId as ProjectId))
          .branches,
      {
        isPromise: true,
        maxAge: 5 * 60 * 1000,
        maxArgs: 0,
      }
    ),
    [appCtx, projectId]
  );

  const refreshBranchData = React.useCallback(
    () => [...fetchBranches.keys()].forEach((key) => fetchBranches.remove(key)),
    [fetchBranches]
  );

  const previousLocation = React.useRef<Location<unknown>>(
    appCtx.history.location
  );
  React.useEffect(() => {
    const dispose = appCtx.history.listen((newLocation) => {
      const oldBranchName = parseProjectLocation(
        previousLocation.current
      )?.branchName;
      const newBranchName = parseProjectLocation(newLocation)?.branchName;
      if (project && oldBranchName !== newBranchName) {
        spawn(
          (async () => {
            const branches = await fetchBranches();
            const oldBranch = branches.find((b) => b.name === oldBranchName);
            const newBranch = branches.find((b) => b.name === newBranchName);
            if (
              new URL(getHostUrl(project, oldBranch, appCtx.appConfig)).href !==
              new URL(getHostUrl(project, newBranch, appCtx.appConfig)).href
            ) {
              await refreshStudio();
            }
          })()
        );
      }
      previousLocation.current = newLocation;
    });
    return dispose;
  }, [appCtx, refreshStudio, project]);

  usePreventDefaultBrowserPinchToZoomBehavior();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsRefreshingProjectData(true);
        const [{ projects, perms: permissions }, { trustedHosts }] =
          await Promise.all([
            appCtx.api.getProjects({
              query: "byIds",
              projectIds: [projectId],
            }),
            appCtx.api.getTrustedHostsList(),
          ]);
        const proj = maybeOne(projects);
        if (!proj) {
          throw new ForbiddenError("Project not found");
        }
        let maybeBranch: ApiBranch | undefined = undefined;
        const branchName = parseProjectLocation(
          appCtx.history.location
        )?.branchName;
        if (branchName && branchName !== MainBranchId) {
          maybeBranch = (await fetchBranches()).find(
            (b) => b.name === branchName
          );
        }
        const hostUrl = getHostUrl(proj, maybeBranch, appCtx.appConfig);
        setBranch(maybeBranch);
        const urlsOrDomains = [
          ...trustedHosts.map((i) => i.hostUrl),
          ...whitelistedHosts,
          ...appCtx.appConfig.globalTrustedHosts,
        ];
        if (
          (proj.hostUrl || DEVFLAGS.hostUrl) &&
          !urlsOrDomains.includes(hostUrl) &&
          !urlsOrDomains.includes(new URL(hostUrl).origin)
        ) {
          setUntrustedHost(true);
        }
        const userAccessLevel = appCtx.selfInfo
          ? getAccessLevelToResource(
              { type: "project", resource: proj },
              appCtx.selfInfo,
              permissions
            )
          : "blocked";
        setPerms(permissions);
        const accessLevel =
          accessLevelRank(userAccessLevel) >
          accessLevelRank(proj.defaultAccessLevel)
            ? userAccessLevel
            : proj.defaultAccessLevel;
        setEditorPerm(
          accessLevelRank(accessLevel) >= accessLevelRank("content")
        );
        setProject(proj);
        if (appCtx.appConfig.defaultHostUrl !== DEVFLAGS.defaultHostUrl) {
          const message = `Mismatching host URLs! appConfig defaults to ${appCtx.appConfig.defaultHostUrl} while devflags points to ${DEVFLAGS.defaultHostUrl}`;
          console.error(message);
          reportError(new Error(message));
        }
        setIsRefreshingProjectData(false);
      } catch (e) {
        setIsRefreshingProjectData(false);
        if (!appCtx.selfInfo) {
          // User is not logged and project is not public.
          await appCtx.history.replace(getLoginRouteWithContinuation());
          return;
        }
        if (e.statusCode === 403) {
          notification.error({
            message: "Could not open project",
            description:
              "This project does not exist or you do not have access to it.",
          });
          return;
        }
        throw e;
      }
    };
    spawn(fetchProject());
  }, [projectId, setProject, fetchProjectCount]);

  const { topFrameApi, ...topFrameChromeProps } = useTopFrameState({
    appCtx,
    project,
    forceUpdate,
    toggleAdminMode,
  });

  useBrowserNotification();

  if (!project) {
    return null;
  }

  const src = new URL(getHostUrl(project, branch, appCtx.appConfig));

  if (untrustedHost) {
    const hostOrigin = src.origin;
    const hostProtocol = src.protocol + "//";
    const hostDomainWithoutProtocol = hostOrigin.substr(hostProtocol.length);
    const draftContainsOrigin =
      swallow(() => new URL(hostProtocol + draft))?.origin === hostOrigin ||
      swallow(() => new URL(draft))?.origin === hostOrigin;
    return (
      <Modal visible footer={null} title="Project is hosted by another app">
        The project {project.name} is <i>app-hosted</i>. This means it's running
        a third-party app that can show anything on screen, including the
        Plasmic login screen. Only open projects that are hosted by domains you
        trust! [
        <a href="https://www.plasmic.app/learn/app-hosting/" target="_blank">
          Learn more about app hosting
        </a>
        ].
        <br />
        <br />
        Enter the domain <code>{hostOrigin}</code> to add it to your{" "}
        <PublicLink href={UU.settings.fill({})}>trusted list</PublicLink>.
        <HostUrlInput
          className="mv-xlg"
          hostProtocolSelect={{
            isDisabled: true,
            value: hostProtocol,
          }}
          urlInput={{
            props: {
              value: draft || "",
              onChange: (e) => setDraft(e.currentTarget.value ?? ""),
              placeholder: hostDomainWithoutProtocol,
            },
          }}
          confirmButton={{
            props: {
              onClick: () => {
                if (!draftContainsOrigin) {
                  return;
                }

                if (appCtx.selfInfo) {
                  spawn(
                    appCtx.api
                      .addTrustedHost(hostOrigin)
                      .then(() => location.reload())
                  );
                }

                setUntrustedHost(false);
              },
              disabled: !draftContainsOrigin,
            },
          }}
          clearButton={{
            render: () => null,
          }}
        />
      </Modal>
    );
  }

  // We send the params via a hash parameter so that the host server cannot see them.
  src.hash = buildPlasmicStudioArgsHash(appCtx.appConfigOverrides);

  return (
    <TopFrameCtxProvider projectId={projectId} topFrameApi={topFrameApi}>
      {!untrustedHost && (
        <HostLoadTimeoutPrompt project={project} editorPerm={editorPerm} />
      )}
      <TopFrameChrome
        appCtx={appCtx}
        pathname={location.pathname}
        project={project}
        refreshProjectAndPerms={refreshProjectAndPerms}
        isRefreshingProjectData={isRefreshingProjectData}
        editorPerm={editorPerm}
        perms={perms}
        refreshStudio={refreshStudio}
        topFrameApi={topFrameApi}
        refreshBranchData={refreshBranchData}
        {...topFrameChromeProps}
      />
      <iframe className={"studio-frame"} src={src.toString()} />
    </TopFrameCtxProvider>
  );
}
