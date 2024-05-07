import { U } from "@/wab/client/cli-routes";
import { promptMoveToWorkspace } from "@/wab/client/components/dashboard/dashboard-actions";
import EditableResourceName from "@/wab/client/components/EditableResourceName";
import { HostConfig } from "@/wab/client/components/HostConfig";
import { maybeShowPaywall } from "@/wab/client/components/modals/PricingModal";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import { ClickStopper } from "@/wab/client/components/widgets";
import { Textbox } from "@/wab/client/components/widgets/Textbox";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { PlasmicProjectListItem } from "@/wab/client/plasmic/plasmic_kit/PlasmicProjectListItem";
import { ensure } from "@/wab/common";
import { InlineEdit } from "@/wab/commons/components/InlineEdit";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { Stated } from "@/wab/commons/components/Stated";
import { DEVFLAGS } from "@/wab/devflags";
import { ApiPermission, ApiProject } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { PERSONAL_WORKSPACE } from "@/wab/shared/Labels";
import {
  getAccessLevelToParent,
  getAccessLevelToResource,
} from "@/wab/shared/perms";
import { Menu, notification } from "antd";
import moment from "moment";
import React from "react";
import { useHistory } from "react-router-dom";

interface ProjectListItemProps {
  // className prop is required for positioning instances of
  // this Component
  className?: string;
  project: ApiProject;
  perms: ApiPermission[];
  onUpdate?: () => Promise<void>;
  workspaces?: boolean;
  matcher?: Matcher;
  showWorkspace?: boolean;
}

function ProjectListItem(props: ProjectListItemProps) {
  const { project, perms, onUpdate, workspaces, matcher, showWorkspace } =
    props;
  const appCtx = useAppCtx();
  const history = useHistory();
  const appOps = ensure(appCtx.ops, "Unexpected nullish AppOps");
  const [configProjectId, setConfigProjectId] = React.useState<string>();

  const projectAccessLevel = getAccessLevelToResource(
    { type: "project", resource: project },
    appCtx.selfInfo,
    perms
  );

  const workspaceAccessLevel = getAccessLevelToParent(
    { type: "project", resource: project },
    appCtx.selfInfo,
    perms
  );

  const canMove = project.workspaceId
    ? accessLevelRank(workspaceAccessLevel) >= accessLevelRank("editor")
    : accessLevelRank(projectAccessLevel) >= accessLevelRank("editor");

  const personalWorkspace = React.useMemo(
    () => appCtx.personalWorkspace,
    [appCtx.workspaces]
  );

  return (
    <>
      <PlasmicProjectListItem
        root={{
          as: PublicLink,
          props: {
            className: props.className,
            href: U.project({
              projectId: project.id,
            }),
          },
        }}
        showWorkspace={
          !!(
            accessLevelRank(workspaceAccessLevel) >=
              accessLevelRank("viewer") &&
            showWorkspace &&
            project.workspaceName
          )
        }
        workspace={{
          wrap: (node) => <ClickStopper preventDefault>{node}</ClickStopper>,
          props: {
            children:
              project.workspaceId === personalWorkspace?.id
                ? PERSONAL_WORKSPACE
                : matcher?.boldSnippets(
                    project.workspaceName || "",
                    "yellow-snippet"
                  ) || project.workspaceName,
            onClick: () => {
              history.push(
                project.workspaceId === personalWorkspace?.id
                  ? U.playground({})
                  : U.workspace({ workspaceId: project.workspaceId || "" })
              );
            },
          },
        }}
        timestamp={`updated ${moment(project.updatedAt).fromNow()}`}
        editableName={{
          render: (editableNameProps) => (
            <>
              <InlineEdit
                render={({ onDone, editing, onStart }) =>
                  editing ? (
                    <div
                      className={editableNameProps.className}
                      style={{ width: 300 }}
                    >
                      <ClickStopper preventDefault>
                        <Stated defaultValue={false}>
                          {(submitting, setSubmitting) => (
                            <OnClickAway onDone={onDone}>
                              <Textbox
                                autoFocus
                                selectAllOnFocus
                                defaultValue={project.name}
                                onEdit={async (val) => {
                                  setSubmitting(true);
                                  await appOps.renameSite(project.id, val);
                                  // Just update this rather than re-fetching data.
                                  project.name = val;
                                  setSubmitting(false);
                                  onDone();
                                }}
                                onEscape={onDone}
                                onBlur={onDone}
                                disabled={submitting}
                              />
                            </OnClickAway>
                          )}
                        </Stated>
                      </ClickStopper>
                    </div>
                  ) : (
                    <EditableResourceName
                      {...editableNameProps}
                      {...(accessLevelRank(projectAccessLevel) <
                      accessLevelRank("content")
                        ? { cantEdit: true }
                        : {})}
                      {...{
                        onEdit: onStart,
                        name:
                          matcher?.boldSnippets(
                            project.name,
                            "yellow-snippet"
                          ) || project.name,
                      }}
                    />
                  )
                }
              />
            </>
          ),
        }}
        shared={{
          resource: { type: "project", resource: project },
          perms,
          reloadPerms: async () => {
            await onUpdate?.();
          },
        }}
        menuButton={{
          props: {
            menu: () => (
              <Menu>
                {accessLevelRank(projectAccessLevel) >=
                  accessLevelRank("editor") && (
                  <Menu.Item onClick={() => setConfigProjectId(project.id)}>
                    <strong>Configure</strong> project
                  </Menu.Item>
                )}
                <Menu.Item
                  onClick={async () => {
                    const response = await promptMoveToWorkspace(
                      appCtx,
                      null,
                      false,
                      "Duplicate",
                      project.name
                    );
                    if (response === undefined) {
                      return;
                    }

                    const { projectId: newProjectId } =
                      await appCtx.app.withSpinner(
                        appCtx.api.cloneProject(
                          project.id,
                          response.result === "workspace"
                            ? {
                                workspaceId: response.workspace.id,
                                name: response.name,
                              }
                            : undefined
                        )
                      );

                    history.push(
                      U.project({
                        projectId: newProjectId,
                      })
                    );
                  }}
                >
                  <strong>Duplicate</strong> project
                </Menu.Item>
                {DEVFLAGS.demo && (
                  <Menu.Item onClick={() => appOps.download(project.id)}>
                    <strong>Download</strong> project
                  </Menu.Item>
                )}
                {workspaces && canMove && (
                  <Menu.Item
                    onClick={async () => {
                      const response = await promptMoveToWorkspace(
                        appCtx,
                        project.workspaceId,
                        false,
                        "Move"
                      );
                      if (response === undefined) {
                        return;
                      }
                      await maybeShowPaywall(
                        appCtx,
                        async () =>
                          await appCtx.api.setSiteInfo(project.id, {
                            workspaceId:
                              response.result === "workspace"
                                ? response.workspace.id
                                : null,
                          }),
                        {
                          title: "Upgrade to move this project",
                          description:
                            "The destination workspace belongs to a team that does not have enough seats. Increase the number of seats to perform this action.",
                        }
                      );
                      notification.info({
                        message: `Project moved to ${
                          response.result === "workspace"
                            ? response.workspace.name
                            : PERSONAL_WORKSPACE
                        }.`,
                      });
                      await onUpdate?.();
                    }}
                  >
                    <strong>Move</strong> to workspace
                  </Menu.Item>
                )}
                {accessLevelRank(workspaceAccessLevel) >=
                  accessLevelRank("editor") && (
                  <Menu.Item
                    onClick={async () => {
                      await appCtx.api.setSiteInfo(project.id, {
                        isUserStarter: !project.isUserStarter,
                      });
                      notification.success({
                        message: `Project "${project.name}" ${
                          project.isUserStarter ? "unset" : "set"
                        } as workspace starter.`,
                      });

                      await onUpdate?.();
                    }}
                  >
                    <strong>{!project.isUserStarter ? "Set" : "Unset"}</strong>{" "}
                    as workspace starter
                  </Menu.Item>
                )}
                {!(
                  accessLevelRank(workspaceAccessLevel) >=
                  accessLevelRank("viewer")
                ) &&
                  accessLevelRank(projectAccessLevel) <
                    accessLevelRank("owner") && (
                    <Menu.Item
                      onClick={async () => {
                        const confirm = await reactConfirm({
                          title: `Remove from dashboard`,
                          message: (
                            <>
                              Are you sure you want to remove the project{" "}
                              <strong>{project.name}</strong> from your
                              dashboard? This will remove your current
                              permissions on it.
                            </>
                          ),
                        });
                        if (!confirm) {
                          return;
                        }
                        await appCtx.api.removeSelfPerm(project.id);
                        await onUpdate?.();
                      }}
                    >
                      <strong>Remove</strong> from dashboard
                    </Menu.Item>
                  )}
                {accessLevelRank(projectAccessLevel) >=
                  accessLevelRank("owner") && (
                  <Menu.Item
                    onClick={async () => {
                      const confirm = await reactConfirm({
                        title: `Delete project`,
                        message: (
                          <>
                            Are you sure you want to delete the project{" "}
                            <strong>{project.name}</strong>?
                          </>
                        ),
                      });
                      if (!confirm) {
                        return;
                      }
                      await appOps.deleteSite(project.id);
                      await onUpdate?.();
                    }}
                  >
                    <strong>Delete</strong> project
                  </Menu.Item>
                )}
              </Menu>
            ),
          },
          wrap: (node) => <ClickStopper preventDefault>{node}</ClickStopper>,
        }}
        projectIdCopyButton={{
          wrap: (node) => <ClickStopper preventDefault>{node}</ClickStopper>,
          props: {
            version: project.id,
            onClick: async () => {
              await navigator.clipboard.writeText(project.id);
            },
          },
        }}
      />
      {configProjectId && (
        <HostConfig
          appCtx={appCtx}
          project={project}
          onCancel={() => {
            setConfigProjectId(undefined);
          }}
          onUpdate={() => Promise.resolve(void onUpdate?.())}
        />
      )}
    </>
  );
}

export default ProjectListItem as React.FunctionComponent<ProjectListItemProps>;
