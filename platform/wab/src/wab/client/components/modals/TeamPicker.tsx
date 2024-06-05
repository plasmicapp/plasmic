import { AppCtx } from "@/wab/client/app-ctx";
import TeamPickerItem from "@/wab/client/components/modals/TeamPickerItem";
import { Spinner } from "@/wab/client/components/widgets";
import {
  DefaultTeamPickerProps,
  PlasmicTeamPicker,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamPicker";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import { getNewPriceTierType } from "@/wab/shared/pricing/pricing-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
interface TeamPickerProps extends DefaultTeamPickerProps {
  appCtx: AppCtx;
  // Callback when a team is chosen
  onSelect: (t: ApiTeam) => void;
  // Filters which teams to show
  teamFilter?: (t: ApiTeam) => boolean;
  disabled?: boolean;
}

function TeamPicker_(props: TeamPickerProps, ref: HTMLElementRefOf<"div">) {
  const { appCtx, onSelect, teamFilter, disabled, ...rest } = props;
  const [newTeamName, setNewTeamName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const teams = appCtx.getAllTeams();
  const filteredTeams = teamFilter ? teams.filter(teamFilter) : teams;

  return disabled ? (
    <Spinner />
  ) : (
    <PlasmicTeamPicker
      root={{ ref }}
      {...rest}
      newTeamName={{
        value: newTeamName,
        onChange: (e) => {
          setNewTeamName(e.target.value);
        },
        autoFocus: true,
      }}
      createTeamButton={{
        disabled: loading,
        onClick: async () => {
          setLoading(true);
          const teamResp = await appCtx.api.createTeam(newTeamName);
          onSelect(teamResp.team);
        },
      }}
      noTeams={filteredTeams.length <= 0}
    >
      {filteredTeams.map((team) => (
        <TeamPickerItem
          key={team.id}
          name={team.name}
          newTier={getNewPriceTierType(team.featureTier?.name)}
          onClick={() => onSelect(team)}
        />
      ))}
    </PlasmicTeamPicker>
  );
}

const TeamPicker = React.forwardRef(TeamPicker_);
export default TeamPicker;
