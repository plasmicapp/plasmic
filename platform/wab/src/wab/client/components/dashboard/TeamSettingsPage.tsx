import { UU } from "@/wab/client/cli-routes";
import {
  DefaultTeamSettingsPageProps,
  PlasmicTeamSettingsPage,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamSettingsPage";
import { TeamId } from "@/wab/shared/ApiSchema";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

interface TeamSettingsPageProps extends DefaultTeamSettingsPageProps {
  teamId: TeamId;
}

function TeamSettingsPage_(
  props: TeamSettingsPageProps,
  ref: HTMLElementRefOf<"div">
) {
  const { teamId, ...rest } = props;
  return (
    <PlasmicTeamSettingsPage
      root={{ ref }}
      defaultLayout={{
        helpButton: {
          props: {
            href: UU.orgSupport.fill({ teamId }),
          },
        },
      }}
      settings={{ teamId }}
      {...rest}
    />
  );
}

const TeamSettingsPage = React.forwardRef(TeamSettingsPage_);
export default TeamSettingsPage;
