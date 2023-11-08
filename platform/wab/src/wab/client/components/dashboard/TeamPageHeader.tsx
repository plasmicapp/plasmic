/** @format */

import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { InlineEdit } from "../../../commons/components/InlineEdit";
import { OnClickAway } from "../../../commons/components/OnClickAway";
import { Stated } from "../../../commons/components/Stated";
import { ApiPermission, ApiTeam } from "../../../shared/ApiSchema";
import { accessLevelRank } from "../../../shared/EntUtil";
import { ORGANIZATION_CAP } from "../../../shared/Labels";
import { getAccessLevelToResource } from "../../../shared/perms";
import { U } from "../../cli-routes";
import { useAppCtx } from "../../contexts/AppContexts";
import {
  DefaultTeamPageHeaderProps,
  PlasmicTeamPageHeader,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicTeamPageHeader";
import ChartsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__Chartsvg";
import EditableResourceName from "../EditableResourceName";
import { Icon } from "../widgets/Icon";
import IconButton from "../widgets/IconButton";
import Textbox from "../widgets/Textbox";
import { promptNewWorkspace } from "./dashboard-actions";
import { ProjectsFilterProps } from "./ProjectsFilter";

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
          href: U.orgSettings({ teamId: team.id }),
          tooltip: `${ORGANIZATION_CAP} settings`,
        },
        wrap: (node) => {
          if (appCtx.appConfig.analytics) {
            return (
              <>
                {node}
                <IconButton
                  href={U.orgAnalytics({ teamId: team.id })}
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
