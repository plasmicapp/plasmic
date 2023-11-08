import React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";
import { uniqueName, withoutNils } from "../../../common";
import { ApiEndUserDirectory, ApiProject } from "../../../shared/ApiSchema";
import { AppCtx } from "../../app-ctx";
import { useTopFrameCtx } from "../../frame-ctx/top-frame-ctx";
import { trackEvent } from "../../tracking";
import { Spinner, Tab, Tabs } from "../widgets";
import Button from "../widgets/Button";
import ActivityTab from "./ActivityTab";
import {
  useAppAuthConfig,
  useMutateHostAppAuthData,
  useTeamDirectories,
} from "./app-auth-contexts";
import AuthConfig from "./AuthConfig";
import { APP_AUTH_TRACKING_EVENT } from "./constants";
import DirectoryConfig from "./DirectoryConfig";
import PermissionsTab from "./PermissionsTab";
import SettingsTab from "./SettingsTab";

interface AppAuthSettingsModalProps {
  appCtx: AppCtx;
  project: ApiProject;
  defaultPageRoleId: string | null | undefined;
  setDefaultPageRoleId: (roleId: string | null | undefined) => void;
  onCancel: () => void;
}

function AppAuthSettings(props: AppAuthSettingsModalProps) {
  const { appCtx, project, defaultPageRoleId, setDefaultPageRoleId, onCancel } =
    props;
  const teamId = project.teamId;
  const { hostFrameApi } = useTopFrameCtx();
  const {
    config,
    mutate: mutateAuthConfig,
    loading: isLoadingAuthConfig,
  } = useAppAuthConfig(appCtx, project.id);
  const { directories, mutate: mutateTeamDirectories } = useTeamDirectories(
    appCtx,
    teamId ?? undefined
  );
  const mutateHostAppAuthData = useMutateHostAppAuthData(project.id);
  const [isSettingUp, setIsSettingUp] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState<
    "permissions" | "settings" | "activity"
  >("permissions");
  const [selectedDirectory, setSelectedDirectory] =
    React.useState<ApiEndUserDirectory | null>(null);

  if (isLoadingAuthConfig) {
    return (
      <Modal
        title="Enable auth for this app?"
        open
        onCancel={onCancel}
        footer={null}
      >
        <Spinner />
      </Modal>
    );
  }

  if (!teamId) {
    return (
      <Modal
        title="Enable auth for this app?"
        open
        onCancel={onCancel}
        footer={null}
      >
        <p>
          The current project is not associated with a team. Please move it to a
          team.
        </p>
        <a href="/projects">Go to dashboard</a>
      </Modal>
    );
  }

  if (!config) {
    return (
      <Modal
        title="Enable auth for this app?"
        open
        onCancel={onCancel}
        footer={null}
      >
        With auth you can control who can access your app and manage their
        permissions. Using role-based access control, you can build apps that
        are secure and easy to manage. Apps with auth enabled can't be imported
        into other apps.
        <div className="mt-xlg">
          <Button
            type="primary"
            className="mr-sm"
            onClick={async () => {
              trackEvent(APP_AUTH_TRACKING_EVENT, {
                action: "setup",
              });
              await mutateAuthConfig(async () => {
                setIsSettingUp(true);
                let directoryId: string | undefined;
                // Always creates a new directory for every app, make it so that is less
                // of an issue to change the directory later
                const directory = await appCtx.api.createEndUserDirectory(
                  teamId,
                  uniqueName(
                    withoutNils(directories.map((d) => d.name)),
                    `App "${project.name}" directory`
                  )
                );
                directoryId = directory.id;
                await appCtx.api.upsertAppAuthConfig(project.id, {
                  directoryId,
                  provider: "plasmic-auth",
                });
                const newConfig = await appCtx.api.getAppAuthConfig(project.id);
                await mutateTeamDirectories();
                const roles = await appCtx.api.listAppRoles(project.id);
                // Get the first role with order bigger than 0, which should be the normal user role
                const normalUserRole = roles.find((r) => r.order === 1);
                if (normalUserRole) {
                  setDefaultPageRoleId(normalUserRole.id);
                  await hostFrameApi.setDefaultPageRoleId(normalUserRole.id);
                }
                setIsSettingUp(false);
                return newConfig;
              });
              await mutateHostAppAuthData();
              await hostFrameApi.refreshSiteInfo();
            }}
          >
            {isSettingUp ? "Loading..." : "Continue"}
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      closable={false}
      onCancel={() => onCancel()}
      footer={null}
      destroyOnClose
      bodyStyle={{
        padding: 0,
      }}
    >
      {selectedDirectory ? (
        <DirectoryConfig
          project={project}
          directoryId={selectedDirectory.id}
          onCancel={onCancel}
          goBack={() => {
            setSelectedDirectory(null);
          }}
        />
      ) : (
        <AuthConfig
          appCtx={appCtx}
          appId={project.id}
          selected={currentTab}
          disableAppAuth={async () => {
            await mutateAuthConfig(() => null);
          }}
          onCancel={onCancel}
        >
          <div className="fill-width">
            <Tabs
              onSwitch={(tabKey) => {
                setCurrentTab(tabKey);
              }}
              barWrapper={(bar) => (
                <div
                  style={{
                    fontSize: 12,
                    paddingLeft: 16,
                  }}
                >
                  {bar}
                </div>
              )}
              tabKey={currentTab}
              useDefaultClasses={false}
              tabClassName="hilite-tab"
              activeTabClassName="hilite-tab--active"
              tabs={[
                new Tab({
                  name: "Permissions",
                  key: "permissions",
                  contents: () => {
                    return (
                      <PermissionsTab
                        appCtx={appCtx}
                        project={project}
                        directoryId={config.directoryId!}
                      />
                    );
                  },
                }),
                new Tab({
                  name: "Settings",
                  key: "settings",
                  contents: () => {
                    return (
                      <SettingsTab
                        project={project}
                        defaultPageRoleId={defaultPageRoleId}
                        setSelectedDirectory={setSelectedDirectory}
                      />
                    );
                  },
                }),
                new Tab({
                  name: "Users",
                  key: "users",
                  contents: () => {
                    return <ActivityTab projectId={project.id} />;
                  },
                }),
              ]}
            ></Tabs>
          </div>
        </AuthConfig>
      )}
    </Modal>
  );
}

export function AppAuthSettingsModal({
  appCtx,
  project,
  onCancel,
  defaultPageRoleId,
  setDefaultPageRoleId,
}: AppAuthSettingsModalProps) {
  return (
    <AppAuthSettings
      defaultPageRoleId={defaultPageRoleId}
      setDefaultPageRoleId={setDefaultPageRoleId}
      appCtx={appCtx}
      project={project}
      onCancel={onCancel}
    />
  );
}
