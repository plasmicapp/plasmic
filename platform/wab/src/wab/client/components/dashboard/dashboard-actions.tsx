import { AppCtx } from "@/wab/client/app-ctx";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { ContentEditorConfigModal } from "@/wab/client/components/modals/ContentEditorConfigModal";
import { maybeShowPaywall } from "@/wab/client/components/modals/PricingModal";
import {
  reactConfirm,
  reactPrompt,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import Select from "@/wab/client/components/widgets/Select";
import Textbox from "@/wab/client/components/widgets/Textbox";
import {
  ApiPermission,
  ApiTeam,
  ApiWorkspace,
  CmsDatabaseId,
  TeamId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import {
  ORGANIZATION_CAP,
  ORGANIZATION_LOWER,
  ORGANIZATION_PLURAL_LOWER,
  PERSONAL_WORKSPACE,
} from "@/wab/shared/Labels";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import {
  canEditUiConfig,
  mergeUiConfigs,
  UiConfig,
} from "@/wab/shared/ui-config-utils";
import { Form, Menu } from "antd";
import { History } from "history";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { MakeADT } from "ts-adt/MakeADT";

interface TeamMenuProps {
  appCtx: AppCtx;
  team: ApiTeam;
  items: TeamMenuItem[];
  onUpdate: () => Promise<void>;
  redirectOnDelete?: boolean;
}

// This is only needed to conditionally hide the three dot button
// since the three dots and menus are independent components.
// TODO: Build a three dot button + menu component.
type TeamMenuItem = "ui-config" | "delete";
export function getTeamMenuItems(appCtx: AppCtx, team: ApiTeam) {
  const accessLevel = getAccessLevelToResource(
    { type: "team", resource: team },
    appCtx.selfInfo,
    appCtx.perms
  );

  const items: TeamMenuItem[] = [];
  if (
    canEditUiConfig(
      team,
      { type: "team", resource: team },
      appCtx.selfInfo,
      appCtx.perms
    )
  ) {
    items.push("ui-config");
  }
  if (accessLevelRank(accessLevel) >= accessLevelRank("owner")) {
    items.push("delete");
  }
  return items;
}

export function TeamMenu(props: TeamMenuProps) {
  const { appCtx, team, items, onUpdate, redirectOnDelete } = props;
  const history = useHistory();

  const builder = new MenuBuilder();

  if (items.includes("ui-config")) {
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key="ui-config"
          onClick={async () => {
            const config = await promptContentCreatorConfig(
              appCtx,
              `Studio UI for "${team.name}"`,
              team.uiConfig ?? {},
              "team"
            );
            if (config) {
              await appCtx.api.updateTeam(team.id, {
                uiConfig: config,
              });
              await onUpdate();
            }
          }}
        >
          Configure Studio UI for {ORGANIZATION_CAP}
        </Menu.Item>
      );
    });
  }

  if (items.includes("delete")) {
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key="delete"
          onClick={async () => {
            const { meta } = await appCtx.app.withSpinner(
              appCtx.api.getTeamMeta(team.id)
            );
            const confirm = await reactConfirm({
              title: `Delete ${ORGANIZATION_LOWER}`,
              message: (
                <>
                  <p>
                    Are you sure you want to delete the {ORGANIZATION_LOWER}{" "}
                    <strong>{team.name}</strong>?
                  </p>
                  {meta.workspaceCount ? (
                    <p>
                      If you delete it, you will also lose its{" "}
                      <strong>{meta.workspaceCount} workspaces</strong>
                      {meta.projectCount ? (
                        <>
                          {" "}
                          and <strong>{meta.projectCount} projects</strong>
                        </>
                      ) : (
                        ``
                      )}
                      . If you want to keep those workspaces and projects,
                      please move them to a different {ORGANIZATION_LOWER}{" "}
                      first.
                    </p>
                  ) : (
                    ``
                  )}
                </>
              ),
            });
            if (!confirm) {
              return;
            }
            await appCtx.api.deleteTeam(team.id);
            await appCtx.reloadAppCtx();
            if (redirectOnDelete) {
              history.push(fillRoute(APP_ROUTES.allProjects, {}));
            } else {
              await onUpdate();
            }
          }}
        >
          <strong>Delete</strong> {ORGANIZATION_LOWER}
        </Menu.Item>
      );
    });
  }

  return builder.build();
}

interface WorkspaceMenuProps {
  appCtx: AppCtx;
  workspace: ApiWorkspace;
  perms: ApiPermission[];
  onUpdate: () => Promise<void>;
  redirectOnDelete?: boolean;
  projectCount: number | undefined;
}

export function WorkspaceMenu(props: WorkspaceMenuProps) {
  const history = useHistory();
  const {
    appCtx,
    workspace,
    perms,
    onUpdate,
    redirectOnDelete,
    projectCount,
    ...rest
  } = props;

  const workspaceAccessLevel = getAccessLevelToResource(
    { type: "workspace", resource: workspace },
    appCtx.selfInfo,
    perms
  );

  const teamAccessLevel = getAccessLevelToResource(
    { type: "team", resource: workspace.team },
    appCtx.selfInfo,
    perms
  );

  return (
    <Menu {...rest}>
      {accessLevelRank(teamAccessLevel) >= accessLevelRank("editor") &&
        workspace.team.featureTier?.editContentCreatorMode && (
          <Menu.Item
            onClick={async () => {
              const contentCreatorConfig = await promptContentCreatorConfig(
                appCtx,
                `Content editor mode for "${workspace.name}"`,
                mergeUiConfigs(
                  appCtx.appConfig.defaultContentCreatorConfig,
                  workspace.contentCreatorConfig ?? undefined
                ),
                "content-editor"
              );

              if (contentCreatorConfig) {
                await appCtx.api.updateWorkspace(workspace.id, {
                  contentCreatorConfig,
                });
                await onUpdate();
              }
            }}
          >
            <strong>Edit</strong> content creator mode
          </Menu.Item>
        )}
      {accessLevelRank(teamAccessLevel) >= accessLevelRank("editor") && (
        <Menu.Item
          onClick={async () => {
            const teamId = await promptTeam(appCtx, workspace.team.id);
            if (!teamId) {
              return;
            }
            await maybeShowPaywall(
              appCtx,
              async () =>
                await appCtx.api.updateWorkspace(workspace.id, { teamId }),
              {
                title: "Upgrade to move this workspace",
                description: `The destination ${ORGANIZATION_LOWER} does not support workspaces or it has no enough seats to move this workspace. Select a new plan and/or increase the number of seats to perform this action.`,
              }
            );
            await appCtx.reloadAppCtx();
            await onUpdate();
          }}
        >
          <strong>Move</strong> to another {ORGANIZATION_LOWER}
        </Menu.Item>
      )}
      {accessLevelRank(workspaceAccessLevel) >= accessLevelRank("owner") && (
        <Menu.Item
          onClick={async () => {
            const confirm = await reactConfirm({
              title: `Delete workspace`,
              message: (
                <>
                  <p>
                    Are you sure you want to delete the workspace{" "}
                    <strong>{workspace.name}</strong>?
                  </p>
                  {projectCount ? (
                    <p>
                      If you delete it, you will also lose its{" "}
                      <strong>
                        {projectCount} project{projectCount > 1 ? "s" : ""}
                      </strong>
                      . If you want to keep those projects, please move them to
                      a different workspace first.
                    </p>
                  ) : (
                    ``
                  )}
                </>
              ),
            });
            if (!confirm) {
              return;
            }
            await appCtx.api.deleteWorkspace(workspace.id);
            await appCtx.reloadAppCtx();
            if (redirectOnDelete) {
              history.push(
                fillRoute(APP_ROUTES.org, { teamId: workspace.team.id })
              );
            } else {
              await onUpdate();
            }
          }}
        >
          <strong>Delete</strong> workspace
        </Menu.Item>
      )}
    </Menu>
  );
}

async function promptTeam(
  appCtx: AppCtx,
  currentTeamId: TeamId
): Promise<TeamId | undefined> {
  const selfInfo = ensure(appCtx.selfInfo, "Unexpected nullish selfInfo");
  const { teams: allTeams, perms } = appCtx;

  const teams = allTeams.filter(
    (t) =>
      t.id !== currentTeamId &&
      accessLevelRank(
        getAccessLevelToResource({ type: "team", resource: t }, selfInfo, perms)
      ) >= accessLevelRank("editor")
  );

  return await showTemporaryPrompt<TeamId | undefined>((onSubmit, onCancel) => (
    <Modal
      title={null}
      visible={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
      wrapClassName="prompt-modal"
    >
      <Form
        onFinish={(e) => {
          onSubmit(e.select ?? undefined);
        }}
        layout="vertical"
      >
        <Form.Item
          name="select"
          label={`Select a destination ${ORGANIZATION_LOWER}:`}
        >
          <Select name="select" autoFocus type="bordered">
            {teams.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.name}
              </Select.Option>
            ))}
            {teams.length === 0 && (
              <Select.Option value={null} isDisabled={true}>
                No {ORGANIZATION_PLURAL_LOWER} to move workspace into.
              </Select.Option>
            )}
          </Select>
        </Form.Item>
        <Form.Item style={{ margin: 0 }}>
          <Button className="mr-sm" type="primary" htmlType="submit">
            Move workspace
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
}

async function promptContentCreatorConfig(
  appCtx: AppCtx,
  title: string,
  currentConfig: UiConfig,
  level: "workspace" | "team" | "content-editor"
): Promise<UiConfig | undefined> {
  return await showTemporaryPrompt<UiConfig | undefined>(
    (onSubmit, onCancel) => (
      <ContentEditorConfigModal
        title={title}
        appCtx={appCtx}
        level={level}
        onSubmit={onSubmit}
        onCancel={onCancel}
        config={currentConfig}
      />
    )
  );
}
type PromptMoveToWorkspaceOperation = "Duplicate" | "Move";
// { result: "noWorkspace" } is used when user submitted the form choosing
// to move the project to their personal drafts space.
type PromptWorkspaceResponse = MakeADT<
  "result",
  {
    workspace: { workspace: ApiWorkspace; name?: string };
    noWorkspace: {};
  }
>;
export async function promptMoveToWorkspace(
  appCtx: AppCtx,
  currentWorkspaceId: WorkspaceId | null,
  allowNoWorkspace: boolean,
  operationLabel: PromptMoveToWorkspaceOperation,
  projectName?: string
): Promise<PromptWorkspaceResponse | undefined> {
  const selfInfo = ensure(appCtx.selfInfo, "Unexpected nullish selfInfo");
  const { workspaces, perms } = appCtx;
  const allTeams = appCtx.getAllTeams();

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.id !== currentWorkspaceId &&
      accessLevelRank(
        getAccessLevelToResource(
          { type: "workspace", resource: w },
          selfInfo,
          perms
        )
      ) >= accessLevelRank("editor")
  );

  return await promptWorkspace({
    workspaces: filteredWorkspaces,
    allTeams,
    allowNoWorkspace,
    confirmButtonMessage: operationLabel,
    message: "Select a destination workspace:",
    noWorkspacesMessage: "No workspaces available.",
    selectedWorkspaceId: currentWorkspaceId ?? undefined,
    projectName,
  });
}

interface PromptWorkspaceProps {
  workspaces: ApiWorkspace[];
  message: string;
  noWorkspacesMessage: string;
  confirmButtonMessage?: PromptMoveToWorkspaceOperation;
  selectedWorkspaceId?: WorkspaceId;
  allowNoWorkspace: boolean;
  allTeams: ApiTeam[];
  projectName?: string;
}

export async function promptWorkspace({
  workspaces,
  message,
  confirmButtonMessage,
  noWorkspacesMessage,
  selectedWorkspaceId,
  allowNoWorkspace,
  allTeams,
  projectName,
}: PromptWorkspaceProps) {
  const defaultNewName = projectName ? `Copy of ${projectName}` : "New Project";
  const teams = allTeams.filter((t) =>
    workspaces.find((w) => w.team.id === t.id)
  );

  return await showTemporaryPrompt<PromptWorkspaceResponse | undefined>(
    (onSubmit, onCancel) => (
      <Modal
        visible={true}
        footer={null}
        onCancel={onCancel}
        closable={false}
        wrapClassName="prompt-modal"
      >
        <Form
          onFinish={(e) => {
            const workspace = workspaces.find((w) => w.id === e.select);
            if (workspace) {
              onSubmit({
                result: "workspace",
                workspace,
                name: e.name || undefined,
              });
            } else {
              if (allowNoWorkspace) {
                onSubmit({ result: "noWorkspace" });
              } else {
                onCancel();
              }
            }
          }}
          layout="vertical"
        >
          {confirmButtonMessage === "Duplicate" && (
            <Form.Item
              name="name"
              label={"Enter a name for the duplicated project"}
            >
              <Textbox
                name="name"
                placeholder={defaultNewName}
                defaultValue={defaultNewName}
                styleType={["bordered"]}
                autoFocus
                data-test-id="promptName"
              />
            </Form.Item>
          )}
          <Form.Item name="select" label={message}>
            <Select name="select" autoFocus>
              {selectedWorkspaceId && allowNoWorkspace ? (
                <Select.Option key="none" value="">
                  {PERSONAL_WORKSPACE}
                </Select.Option>
              ) : null}
              {teams.map((t) => (
                <Select.OptionGroup key={t.id} title={t.name}>
                  {workspaces
                    .filter((w) => w.team.id === t.id)
                    .map((w) => (
                      <Select.Option key={w.id} value={w.id}>
                        {w.name}
                      </Select.Option>
                    ))}
                </Select.OptionGroup>
              ))}
              {!selectedWorkspaceId && teams.length === 0 && (
                <Select.Option value={null} isDisabled={true}>
                  {noWorkspacesMessage}
                </Select.Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item style={{ margin: 0 }} shouldUpdate>
            {({ getFieldsValue }) => {
              const { select } = getFieldsValue();

              return (
                <>
                  <Button
                    disabled={allowNoWorkspace ? false : !Boolean(select)}
                    className="mr-sm"
                    type="primary"
                    htmlType="submit"
                  >
                    {confirmButtonMessage ?? "Confirm"}
                  </Button>
                  <Button onClick={() => onCancel()}>Cancel</Button>
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    )
  );
}

export async function promptNewTeam(appCtx: AppCtx, history: History) {
  const name = await reactPrompt({
    message: `Enter the name for your new ${ORGANIZATION_LOWER}`,
    placeholder: `${ORGANIZATION_CAP} name`,
    actionText: "Add",
  });
  if (!name) {
    return;
  }
  const { team } = await appCtx.api.createTeam(name);
  await appCtx.reloadAppCtx();
  // Redirect to the team page immediately
  history.push(
    fillRoute(APP_ROUTES.org, {
      teamId: team.id,
    })
  );
}

export async function promptNewWorkspace(
  appCtx: AppCtx,
  history: History,
  teamId: TeamId
) {
  const name = await reactPrompt({
    message: `Enter the name for your new workspace`,
    placeholder: "Workspace name",
    actionText: "Add",
  });
  if (!name) {
    return;
  }
  const { workspace } = await maybeShowPaywall(
    appCtx,
    async () =>
      await appCtx.api.createWorkspace({
        name,
        teamId,
      }),
    {
      title: "Upgrade to create a shared workspace",
      description: `This ${ORGANIZATION_LOWER}'s current plan does not support shared workspaces. Select a new plan to upgrade.`,
    }
  );
  await appCtx.reloadAppCtx();
  history.push(
    fillRoute(APP_ROUTES.workspace, {
      workspaceId: workspace.id,
    })
  );
}

export async function promptNewDatabase(
  appCtx: AppCtx,
  history: History,
  workspaceId: WorkspaceId
) {
  const name = await reactPrompt({
    message: `Enter the name for your new CMS database`,
    placeholder: "Database name",
    actionText: "Add",
  });
  if (!name) {
    return;
  }
  const database = await appCtx.api.createDatabase(workspaceId, { name });
  history.push(
    fillRoute(APP_ROUTES.cmsRoot, {
      databaseId: database.id,
    })
  );
}

export async function promptNewTable(
  appCtx: AppCtx,
  history: History,
  databaseId: CmsDatabaseId
) {
  const name = await reactPrompt({
    message: `Enter the name for your new CMS table`,
    placeholder: "Table name",
    actionText: "Add",
  });
  if (!name) {
    return;
  }
  const table = await appCtx.api.createCmsTable(databaseId, {
    name,
    identifier: name,
  });
  history.push(
    fillRoute(APP_ROUTES.model, {
      databaseId,
      tableId: table.id,
    })
  );
}
