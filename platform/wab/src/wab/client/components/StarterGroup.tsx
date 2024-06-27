import StarterProject from "@/wab/client/components/StarterProject";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultStarterGroupProps,
  PlasmicStarterGroup,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicStarterGroup";
import ClockIcon from "@/wab/client/plasmic/plasmic_kit_dashboard/icons/PlasmicIcon__Clock";
import HatchIcon from "@/wab/client/plasmic/plasmic_kit_dashboard/icons/PlasmicIcon__Hatch";
import JoystickIcon from "@/wab/client/plasmic/plasmic_kit_dashboard/icons/PlasmicIcon__Joystick";
import { StarterProjectConfig, StarterSectionConfig } from "@/wab/shared/devflags";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import { isCoreTeamEmail } from "@/wab/shared/devflag-utils";
import { Tooltip } from "antd";
import * as React from "react";

const iconMap = {
  JoystickIcon: <JoystickIcon style={{ width: 20, height: 20 }} />,
  ClockIcon: <ClockIcon />,
  HatchIcon: <HatchIcon />,
};

export interface StarterGroupProps
  extends DefaultStarterGroupProps,
    StarterSectionConfig {
  projects: StarterProjectConfig[];
  workspaceId?: WorkspaceId;
}

function StarterGroup(props: StarterGroupProps) {
  const appCtx = useAppCtx();
  const showPlasmicOnlyProjects = isCoreTeamEmail(
    appCtx.selfInfo?.email,
    appCtx.appConfig
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
        descrip={proj.description}
        icon={proj.iconName ? iconMap[proj.iconName] : undefined}
        imageUrl={proj.imageUrl}
        type={proj.highlightType}
        href={proj.href}
        author={proj.author}
        authorLink={proj.authorLink}
        showPreview={proj.showPreview}
        workspaceId={props.workspaceId}
        withDropShadow={proj.withDropShadow}
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
