import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as _ from "lodash";
import { trimStart } from "lodash";
import * as React from "react";
import { useHistory } from "react-router-dom";
import NewProjectModal from "../../../../NewProjectModal";
import { asOne, ensure, filterMapTruthy, spawn } from "../../../common";
import { InlineEdit } from "../../../commons/components/InlineEdit";
import { OnClickAway } from "../../../commons/components/OnClickAway";
import { Stated } from "../../../commons/components/Stated";
import {
  ApiCmsDatabase,
  ApiPermission,
  ApiProject,
  ApiWorkspace,
} from "../../../shared/ApiSchema";
import { accessLevelRank } from "../../../shared/EntUtil";
import { DATA_SOURCE_PLURAL_LOWER } from "../../../shared/Labels";
import {
  filterDirectResourcePerms,
  getAccessLevelToResource,
} from "../../../shared/perms";
import { useAppCtx } from "../../contexts/AppContexts";
import { useAsyncFnStrict, useAsyncStrict } from "../../hooks/useAsyncStrict";
import {
  DefaultWorkspaceSectionProps,
  PlasmicWorkspaceSection,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicWorkspaceSection";
import EditableResourceName from "../EditableResourceName";
import { maybeShowPaywall } from "../modals/PricingModal";
import ProjectListItem from "../ProjectListItem";
import { Matcher } from "../view-common";
import { Spinner } from "../widgets";
import Textbox from "../widgets/Textbox";
import { promptNewDatabase, WorkspaceMenu } from "./dashboard-actions";
import DatabaseListItem from "./DatabaseListItem";
import { ProjectsFilterProps } from "./ProjectsFilter";
import WorkspaceDataSources from "./WorkspaceDataSources";

interface WorkspaceSectionProps
  extends Omit<DefaultWorkspaceSectionProps, "databases"> {
  workspace: ApiWorkspace;
  projects: ApiProject[];
  databases: ApiCmsDatabase[];
  perms: ApiPermission[];
  onUpdate: () => Promise<void>;
  matcher: Matcher;
  filterProps?: ProjectsFilterProps;
}

function WorkspaceSection_(
  {
    workspace,
    projects,
    databases,
    perms,
    onUpdate,
    matcher,
    filterProps,
    ...rest
  }: WorkspaceSectionProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();

  const workspaceAccessLevel = getAccessLevelToResource(
    { type: "workspace", resource: workspace },
    appCtx.selfInfo,
    perms
  );

  const teamPerms = filterDirectResourcePerms(perms, {
    type: "team",
    id: workspace.team.id,
  });
  const workspacePerms = filterDirectResourcePerms(perms, {
    type: "workspace",
    id: workspace.id,
  });

  const numMembers = _.uniq(
    filterMapTruthy([...teamPerms, ...workspacePerms], (p) =>
      p.user ? p.user.id : p.email
    )
  ).length;

  const history = useHistory();

  const [showNewProjectModal, setShowNewProjectModal] = React.useState(false);
  const hashParams = new URLSearchParams(
    trimStart(history.location.hash ?? "", "#")
  );
  const tabFromHash = hashParams.get("tab") ?? "";
  const openTab = ["projects", "dataSources"].includes(tabFromHash)
    ? (tabFromHash as "projects" | "dataSources")
    : "projects";

  const updateTab = (tab: "projects" | "dataSources") => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    appCtx.router.history.push(`#${params.toString()}`);
  };

  const [asyncData, fetchAsyncData] = useAsyncFnStrict(async () => {
    const dataSources = ensure(
      asOne(await appCtx.api.listDataSources(workspace.id)),
      `Should have found a single team (possibly with an empty list of ${DATA_SOURCE_PLURAL_LOWER})`
    ).dataSources;

    const readOnly =
      accessLevelRank(
        appCtx.perms.find(
          (p) =>
            (p.teamId === workspace.team.id ||
              p.workspaceId === workspace.id) &&
            p.userId ===
              ensure(appCtx.selfInfo, "Unexpected nullish selfInfo").id
        )?.accessLevel || "blocked"
      ) < accessLevelRank("editor");

    return {
      dataSources,
      readOnly,
    };
  }, [appCtx, workspace]);
  useAsyncStrict(fetchAsyncData, [workspace]);

  const databasesList = databases.map((database) => (
    <DatabaseListItem
      key={database.id}
      workspace={workspace}
      database={database}
      matcher={matcher}
      perms={perms}
      onUpdate={onUpdate}
    />
  ));

  const showTabs = !rest.inTeamPage;

  return (
    <>
      <PlasmicWorkspaceSection
        {...rest}
        root={{ ref }}
        editableName={{
          render: (props) => (
            <InlineEdit
              render={({ editing, onStart, onDone }) =>
                editing ? (
                  <div className={props.className} style={{ width: 300 }}>
                    <Stated defaultValue={false}>
                      {(submitting, setSubmitting) => (
                        <OnClickAway onDone={onDone}>
                          <Textbox
                            autoFocus
                            selectAllOnFocus
                            defaultValue={workspace.name}
                            onEdit={async (name) => {
                              if (name) {
                                setSubmitting(true);
                                await maybeShowPaywall(
                                  appCtx,
                                  async () =>
                                    await appCtx.api.updateWorkspace(
                                      workspace.id,
                                      {
                                        name,
                                      }
                                    )
                                );
                                await onUpdate();
                                await appCtx.reloadAppCtx();
                                setSubmitting(false);
                              }
                              onDone();
                            }}
                            onEscape={onDone}
                            onBlur={onDone}
                            disabled={submitting}
                          />
                        </OnClickAway>
                      )}
                    </Stated>
                  </div>
                ) : (
                  <EditableResourceName
                    {...props}
                    {...{
                      name: matcher.boldSnippets(
                        workspace.name,
                        "yellow-snippet"
                      ),
                      onEdit: onStart,
                    }}
                  />
                )
              }
            />
          ),
        }}
        numMembers={numMembers}
        accessLevel={
          accessLevelRank(workspaceAccessLevel) < accessLevelRank("editor")
            ? "cantEdit"
            : undefined
        }
        newProjectButton={{
          onClick: () => setShowNewProjectModal(true),
        }}
        newCmsButton={{
          onClick: () =>
            spawn(promptNewDatabase(appCtx, history, workspace.id)),
        }}
        newCmsButton2={{
          onClick: () =>
            spawn(promptNewDatabase(appCtx, history, workspace.id)),
        }}
        shareButton={{
          resource: { type: "workspace", resource: workspace },
          perms,
          reloadPerms: onUpdate,
        }}
        moreButton={{
          props: {
            menu: (
              <WorkspaceMenu
                appCtx={appCtx}
                workspace={workspace}
                perms={perms}
                onUpdate={onUpdate}
                redirectOnDelete={!rest.inTeamPage}
                projectCount={projects.length}
              />
            ),
          },
        }}
        projectsFilter={filterProps}
        noProjects={!projects.length && (!showTabs || openTab === "projects")}
        noProjectsText={
          matcher.hasQuery()
            ? "No projects matching query."
            : "This workspace has no projects."
        }
        canUseCms={
          !showTabs && (appCtx.appConfig.content || databases.length > 0)
        }
        canUseCmsAndDataSources={showTabs ? openTab : undefined}
        projectsTab={{
          onClick: () => updateTab("projects"),
        }}
        dataSourcesTab={{
          onClick: () => updateTab("dataSources"),
        }}
        // If empty, just show default contents (No CMSes indicator)
        databases={databasesList.length > 0 ? databasesList : undefined}
        overrides={{
          databases: {
            render: () => databasesList,
          },
        }}
        dataSources={{
          render: () =>
            asyncData.value ? (
              <WorkspaceDataSources
                workspaceId={workspace.id}
                appCtx={appCtx}
                dataSources={asyncData.value.dataSources}
                readOnly={asyncData.value.readOnly}
                matcher={matcher}
                onUpdate={async () => {
                  await fetchAsyncData();
                }}
              />
            ) : (
              <Spinner />
            ),
        }}
      >
        {projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            perms={perms}
            onUpdate={onUpdate}
            workspaces={true}
            matcher={matcher}
          />
        ))}
      </PlasmicWorkspaceSection>
      {showNewProjectModal && (
        <NewProjectModal
          onCancel={() => setShowNewProjectModal(false)}
          workspaceId={workspace.id}
        />
      )}
    </>
  );
}

const WorkspaceSection = React.forwardRef(WorkspaceSection_);
export default WorkspaceSection;
