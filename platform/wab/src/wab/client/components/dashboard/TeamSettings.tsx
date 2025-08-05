import {
  getTeamMenuItems,
  TeamMenu,
} from "@/wab/client/components/dashboard/dashboard-actions";
import { Spinner } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import {
  DefaultTeamSettingsProps,
  PlasmicTeamSettings,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamSettings";
import { TeamId } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { accessLevelRank, GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

interface TeamSettingsProps extends DefaultTeamSettingsProps {
  teamId: TeamId;
}

function TeamSettings_(props: TeamSettingsProps, ref: HTMLElementRefOf<"div">) {
  const { teamId, ...rest } = props;
  const appCtx = useAppCtx();
  const selfInfo = ensure(appCtx.selfInfo, "Unexpected nullish selfInfo");

  const { value: data, retry: refetchData } = useAsyncStrict(async () => {
    // needs to fetch subscription before team, because getSubscription will check the subscription status
    const subscriptionResp = await appCtx.api.getSubscription(teamId);
    const team = await appCtx.api.getTeam(teamId);
    const featureTiers = await appCtx.api.listCurrentFeatureTiers();
    const subscription =
      subscriptionResp.type === "success"
        ? { subscription: subscriptionResp.subscription }
        : {};

    const isWhiteLabeled = !!team.team.whiteLabelInfo;

    return {
      ...team,
      ...featureTiers,
      ...subscription,
      isWhiteLabeled,
    };
  }, [appCtx, teamId, selfInfo]);

  if (!data) {
    return <Spinner />;
  }

  const team = data.team;
  const perms = data.perms ?? [];
  const members = data.members ?? [];
  const availFeatureTiers = data.tiers ?? [];
  const subscription = data?.subscription;
  const tier = team.featureTier ?? DEVFLAGS.freeTier;

  const userAccessLevel = team
    ? getAccessLevelToResource(
        { type: "team", resource: team },
        appCtx.selfInfo,
        perms
      )
    : "blocked";
  const readOnly = accessLevelRank(userAccessLevel) < accessLevelRank("editor");

  const teamMenuItems = team ? getTeamMenuItems(appCtx, team) : [];

  return (
    <PlasmicTeamSettings
      root={{ ref }}
      {...rest}
      teamName={team?.name}
      teamMenuButton={
        team && teamMenuItems.length > 0
          ? {
              props: {
                menu: () => (
                  <TeamMenu
                    appCtx={appCtx}
                    team={team}
                    items={teamMenuItems}
                    onUpdate={async () => {
                      refetchData();
                    }}
                    redirectOnDelete={true}
                  />
                ),
              },
            }
          : undefined
      }
      memberList={{
        team,
        members,
        perms,
        tier,
        onChangeRole: async (email: string, role?: GrantableAccessLevel) => {
          if (!team) {
            return;
          }
          await appCtx.api.grantRevoke({
            grants: role
              ? [
                  {
                    email,
                    accessLevel: role,
                    teamId: team.id,
                  },
                ]
              : [],
            revokes: !role
              ? [
                  {
                    email,
                    teamId: team.id,
                  },
                ]
              : [],
          });
          refetchData();
        },
        onRemoveUser: async (email: string) => {
          if (!team) {
            return;
          }
          await appCtx.api.purgeUsersFromTeam({
            teamId: team.id,
            emails: [email],
          });
          refetchData();
        },
        disabled: readOnly,
        onReload: async () => {
          refetchData();
        },
      }}
      teamBilling={
        data.isWhiteLabeled
          ? {
              render: () => null,
            }
          : {
              appCtx,
              team,
              members,
              availFeatureTiers,
              subscription,
              onChange: () => {
                refetchData();
              },
              disabled: readOnly,
            }
      }
    />
  );
}

const TeamSettings = React.forwardRef(TeamSettings_);
export default TeamSettings;
