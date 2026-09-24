import StarterProject from "@/wab/client/components/StarterProject";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultStarterGroupProps,
  PlasmicStarterGroup,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicStarterGroup";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import {
  StarterProjectConfig,
  StarterSectionConfig,
} from "@/wab/shared/devflags";
import { Tooltip } from "antd";
import * as React from "react";

export interface StarterGroupProps
  extends DefaultStarterGroupProps, StarterSectionConfig {
  projects: StarterProjectConfig[];
  workspaceId?: WorkspaceId;
}

function StarterGroup(props: StarterGroupProps) {
  const appCtx = useAppCtx();
  const showPlasmicOnlyProjects = isAdminTeamEmail(
    appCtx.selfInfo?.email,
    appCtx.appConfig,
  );

  const projects = props.projects
    .filter((p) => !p.isPlasmicOnly || showPlasmicOnlyProjects)
    .map((proj) => (
      <StarterProject
        key={proj.tag}
        name={proj.name}
        projectId={proj.projectId}
        baseProjectId={proj.baseProjectId}
        tag={proj.tag}
        instruction={proj.description}
        imageUrl={proj.imageUrl}
        author={proj.author}
        authorLink={proj.authorLink}
        showPreview={proj.showPreview}
        workspaceId={props.workspaceId}
        withDropShadow={proj.withDropShadow}
        withImage={proj.withImage}
        cloneWithoutName={proj.cloneWithoutName}
      />
    ));

  return (
    <PlasmicStarterGroup
      root={{
        // className prop needs to be piped to the root element of this
        // component
        className: props.className,
      }}
      heading={props.title}
      // Only display if there's a tooltip
      infoIcon={{
        wrap: (node) =>
          !props.infoTooltip ? null : (
            <Tooltip title={props.infoTooltip}>
              {node as React.ReactElement}
            </Tooltip>
          ),
      }}
      // Only display if there's a URL
      viewDocs={{
        props: {
          href: props.docsUrl ?? "#",
          text: "Docs",
          hide: !props.docsUrl,
        },
      }}
      // Only display if there's a URL
      more={{
        props: {
          href: props.moreUrl ?? "#",
          text: "See all...",
          hide: !props.moreUrl,
        },
      }}
      twoColumnGrid={props.twoColumnGrid}
      container={projects}
    />
  );
}

export default StarterGroup;
