import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { TeamId } from "../../../shared/ApiSchema";
import {
  DefaultTeamSettingsPageProps,
  PlasmicTeamSettingsPage,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicTeamSettingsPage";

interface TeamSettingsPageProps extends DefaultTeamSettingsPageProps {
  teamId: TeamId;
}

function TeamSettingsPage_(
  props: TeamSettingsPageProps,
  ref: HTMLElementRefOf<"div">
) {
  const { teamId, ...rest } = props;
  return (
    <PlasmicTeamSettingsPage root={{ ref }} {...rest} settings={{ teamId }} />
  );
}

const TeamSettingsPage = React.forwardRef(TeamSettingsPage_);
export default TeamSettingsPage;
