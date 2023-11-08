import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { ensure, swallowAsync } from "../../../common";
import { DEVFLAGS } from "../../../devflags";
import { TeamId } from "../../../shared/ApiSchema";
import { accessLevelRank, GrantableAccessLevel } from "../../../shared/EntUtil";
import { useAppCtx } from "../../contexts/AppContexts";
import { useAsyncFnStrict, useAsyncStrict } from "../../hooks/useAsyncStrict";
import {
  DefaultTeamSettingsProps,
  PlasmicTeamSettings,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicTeamSettings";
import { Spinner } from "../widgets";
import { TeamMenu } from "./dashboard-actions";

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

    const teamOwner = team.team.createdById
      ? (await swallowAsync(appCtx.api.getUsersById([team.team.createdById])))
          ?.users?.[0]
      : undefined;

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
  let members = asyncData?.value?.members ?? [];
  const availFeatureTiers = asyncData?.value?.tiers ?? [];
  const subscription = asyncData?.value?.subscription;
  const tier = team?.featureTier ?? DEVFLAGS.freeTier;

  const readOnly =
    !team ||
    accessLevelRank(
      appCtx.perms.find((p) => p.teamId === team.id && p.userId === selfInfo.id)
        ?.accessLevel || "blocked"
    ) < accessLevelRank("editor");

  return !asyncData.value ? (
    <Spinner />
  ) : (
    <>
      <PlasmicTeamSettings
        root={{ ref }}
        {...rest}
        teamName={team?.name}
        teamMenuButton={
          team
            ? {
                props: {
                  menu: () => (
                    <TeamMenu
                      appCtx={appCtx}
                      team={team}
                      perms={perms}
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
