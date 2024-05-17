import {
  getTeamMenuItems,
  TeamMenu,
} from "@/wab/client/components/dashboard/dashboard-actions";
import { Spinner } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import {
  DefaultTeamSettingsProps,
  PlasmicTeamSettings,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamSettings";
import { ensure } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import { TeamId } from "@/wab/shared/ApiSchema";
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

  // Async data
  const [asyncData, fetchAsyncData] = useAsyncFnStrict(async () => {
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
  useAsyncStrict(fetchAsyncData, [teamId]);
  const team = asyncData?.value?.team;
  const perms = asyncData?.value?.perms ?? [];
  const members = asyncData?.value?.members ?? [];
  const availFeatureTiers = asyncData?.value?.tiers ?? [];
  const subscription = asyncData?.value?.subscription;
  const tier = team?.featureTier ?? DEVFLAGS.freeTier;

  const userAccessLevel = team
    ? getAccessLevelToResource(
        { type: "team", resource: team },
        appCtx.selfInfo,
        perms
      )
    : "blocked";
  const readOnly = accessLevelRank(userAccessLevel) < accessLevelRank("editor");

  const teamMenuItems = team ? getTeamMenuItems(appCtx, team) : [];

  return !asyncData.value ? (
    <Spinner />
  ) : (
    <>
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
                        await fetchAsyncData();
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
            await fetchAsyncData();
          },
          onRemoveUser: async (email: string) => {
            if (!team) {
              return;
            }
            await appCtx.api.purgeUsersFromTeam({
              teamId: team.id,
              emails: [email],
            });
            await fetchAsyncData();
          },
          disabled: readOnly,
          onReload: async () => {
            await fetchAsyncData();
          },
        }}
        teamBilling={
          asyncData.value.isWhiteLabeled
            ? {
                render: () => null,
              }
            : {
                appCtx,
                team,
                members,
                availFeatureTiers,
                subscription,
                onChange: async () => {
                  await fetchAsyncData();
                  await appCtx.reloadAppCtx();
                },
                disabled: readOnly,
              }
        }
      />
    </>
  );
}

const TeamSettings = React.forwardRef(TeamSettings_);
export default TeamSettings;
