import ProjectListItem from "@/wab/client/components/ProjectListItem";
import StarterGroup from "@/wab/client/components/StarterGroup";
import { Spinner } from "@/wab/client/components/widgets";
import {
  useAllProjectsData,
  useAppCtx,
} from "@/wab/client/contexts/AppContexts";
import { useProjectsFilter } from "@/wab/client/hooks/useProjectsFilter";
import {
  DefaultProjectListProps,
  PlasmicProjectList,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicProjectList";
import { getExtraData, updateExtraDataJson } from "@/wab/shared/ApiSchemaUtil";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import React, { useState } from "react";
import { Helmet } from "react-helmet";

interface ProjectListProps extends DefaultProjectListProps {
  workspaces?: boolean;
}

function ProjectList(props: ProjectListProps) {
  const { workspaces, ...rest } = props;

  const appCtx = useAppCtx();
  const selfInfo = ensure(appCtx.selfInfo, "Unexpected undefined selfInfo");

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const { data: projectsData, mutate: updateProjectsData } =
    useAllProjectsData();

  const allProjects = projectsData?.projects || [];

  const {
    projects,
    matcher,
    props: filterProps,
  } = useProjectsFilter(allProjects, []);

  return projectsData === undefined ? (
    <Spinner />
  ) : (
    <>
      {/* @ts-ignore */}
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Bungee&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      <PlasmicProjectList
        {...rest}
        mode={DEVFLAGS.demo ? "demo" : undefined}
        newProjectButton={{
          onClick: () => setShowNewProjectModal(true),
        }}
        filter={filterProps}
        mainList={{
          children: projects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              perms={projectsData.perms}
              onUpdate={updateProjectsData as () => Promise<void>}
              workspaces={workspaces || DEVFLAGS.workspaces}
              matcher={matcher}
              showWorkspace={true}
            />
          )),
        }}
        tutorials={{
          wrap: (node) => {
            if (appCtx.starters.tutorialSections.length === 0) {
              return null;
            }
            return node;
          },
          props: {
            icon: [],
            defaultCollapsed: getExtraData(selfInfo).collapseStarters,
            onSetCollapsed: async (collapsed) => {
              await appCtx.api.updateSelfInfo(
                updateExtraDataJson(selfInfo, {
                  collapseStarters: collapsed,
                })
              );
            },
            children: appCtx.starters.tutorialSections.map((section) => (
              <StarterGroup
                key={section.tag}
                title={section.title}
                tag={section.tag}
                projects={section.projects}
                infoTooltip={section.infoTooltip}
                docsUrl={section.docsUrl}
                moreUrl={section.moreUrl}
                twoColumnGrid
              />
            )),
          },
        }}
        deleted={{
          render: () => null,
        }}
        uploadButton={{
          onClick: () => alert("We do this from the admin page now"),
        }}
        noProjects={!projects.length}
        noProjectsText={
          matcher.hasQuery()
            ? "No projects matching query."
            : 'You have no projects. Create a new one by hitting the "New project" button in the top bar.'
        }
      />
    </>
  );
}

export default ProjectList as React.FunctionComponent<ProjectListProps>;
