/** @format */

import { promptNewWorkspace } from "@/wab/client/components/dashboard/dashboard-actions";
import { ProjectsFilterProps } from "@/wab/client/components/dashboard/ProjectsFilter";
import EditableResourceName from "@/wab/client/components/EditableResourceName";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultTeamPageHeaderProps,
  PlasmicTeamPageHeader,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamPageHeader";
import ChartsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChartSvg";
import { InlineEdit } from "@/wab/commons/components/InlineEdit";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { Stated } from "@/wab/commons/components/Stated";
import { ApiPermission, ApiTeam } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { ORGANIZATION_CAP } from "@/wab/shared/Labels";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useHistory } from "react-router-dom";

interface TeamPageHeaderProps extends DefaultTeamPageHeaderProps {
  team?: ApiTeam;
  perms: ApiPermission[];
  numMembers: number;
  numProjects: number;
  filterProps: ProjectsFilterProps;
  onUpdate: () => Promise<void>;
}

function TeamPageHeader_(
  props: TeamPageHeaderProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const history = useHistory();
  const {
    team,
    perms,
    numMembers,
    numProjects,
    filterProps,
    onUpdate,
    ...rest
  } = props;

  if (!team) {
    return null;
  }

  const teamAccessLevel = getAccessLevelToResource(
    { type: "team", resource: team },
    appCtx.selfInfo,
    perms
  );

  return (
    <PlasmicTeamPageHeader
      {...rest}
      root={{ ref }}
      editableName={{
        render: (_props) => (
          <InlineEdit
            render={({ editing, onStart, onDone }) =>
              editing ? (
                <div className={_props.className} style={{ width: 300 }}>
                  <Stated defaultValue={false}>
                    {(submitting, setSubmitting) => (
                      <OnClickAway onDone={onDone}>
                        <Textbox
                          autoFocus
                          selectAllOnFocus
                          defaultValue={team.name}
                          onEdit={async (name) => {
                            if (name) {
                              setSubmitting(true);
                              await appCtx.api.updateTeam(team.id, {
                                name,
                              });
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
                  {..._props}
                  {...{
                    name: team.name,
                    onEdit: onStart,
                  }}
                />
              )
            }
          />
        ),
      }}
      accessLevel={
        accessLevelRank(teamAccessLevel) < accessLevelRank("viewer")
          ? "none"
          : accessLevelRank(teamAccessLevel) < accessLevelRank("editor")
          ? "cantEdit"
          : undefined
      }
      numProjects={`${numProjects}`}
      numMembers={`${numMembers}`}
      settingsButton={{
        props: {
          href: fillRoute(APP_ROUTES.orgSettings, { teamId: team.id }),
          tooltip: `${ORGANIZATION_CAP} settings`,
        },
        wrap: (node) => {
          if (appCtx.appConfig.analytics) {
            return (
              <>
                {node}
                <IconButton
                  href={fillRoute(APP_ROUTES.orgAnalytics, { teamId: team.id })}
                  tooltip={`${ORGANIZATION_CAP} analytics`}
                >
                  <Icon icon={ChartsvgIcon} />
                </IconButton>
              </>
            );
          } else {
            return node;
          }
        },
      }}
      newWorkspaceButton={{
        props: {
          onClick: async () => {
            await promptNewWorkspace(appCtx, history, team.id);
          },
        },
        wrap: (node) =>
          accessLevelRank(teamAccessLevel) >= accessLevelRank("editor") ? (
            <>{node}</>
          ) : null,
      }}
      filter={filterProps}
    />
  );
}

const TeamPageHeader = React.forwardRef(TeamPageHeader_);
export default TeamPageHeader;
