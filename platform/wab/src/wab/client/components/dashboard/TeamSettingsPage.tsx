import DefaultTeamLayout from "@/wab/client/components/dashboard/DefaultTeamLayout";
import { useUpsellQueryParam } from "@/wab/client/components/dashboard/useUpsellQueryParam";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultTeamSettingsPageProps,
  PlasmicTeamSettingsPage,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamSettingsPage";
import { TeamId } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

interface TeamSettingsPageProps extends DefaultTeamSettingsPageProps {
  teamId: TeamId;
}

function TeamSettingsPage_(
  props: TeamSettingsPageProps,
  ref: HTMLElementRefOf<"div">,
) {
  const { teamId, ...rest } = props;
  const appCtx = useAppCtx();
  const team = ensure(
    appCtx.teams.find((t) => t.id === teamId),
    `Org ${teamId} must be affiliated with the current user`,
  );
  useUpsellQueryParam(team);
  return (
    <PlasmicTeamSettingsPage
      root={{ ref }}
      defaultLayout={{
        as: DefaultTeamLayout,
        props: { team },
      }}
      settings={{ teamId }}
      {...rest}
    />
  );
}

const TeamSettingsPage = React.forwardRef(TeamSettingsPage_);
export default TeamSettingsPage;
