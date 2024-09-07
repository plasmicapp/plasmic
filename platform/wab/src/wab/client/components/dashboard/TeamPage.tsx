import { U, UU } from "@/wab/client/cli-routes";
import FreeTrialModal from "@/wab/client/components/dashboard/FreeTrialModal";
import { documentTitle } from "@/wab/client/components/dashboard/page-utils";
import WorkspaceSection from "@/wab/client/components/dashboard/WorkspaceSection";
import { Spinner } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import { useProjectsFilter } from "@/wab/client/hooks/useProjectsFilter";
import {
  DefaultTeamPageProps,
  PlasmicTeamPage,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamPage";
import { TeamId } from "@/wab/shared/ApiSchema";
import { isNonNil } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import * as React from "react";

interface TeamPageProps extends DefaultTeamPageProps {
  teamId: TeamId;
}

function TeamPage_(props: TeamPageProps, ref: HTMLElementRefOf<"div">) {
  const appCtx = useAppCtx();
  const { teamId, ...rest } = props;
  const inviteId = new URL(location.href).searchParams.get("inviteId") ?? "";
  const [showFreeTrialModal, setShowFreeTrialModal] = React.useState(false);

  const [asyncData, fetchAsyncData] = useAsyncFnStrict(async () => {
    if (inviteId) {
      const response = await appCtx.api.joinTeam({ teamId, inviteId });
      if (!response.status) {
        notification.error({
          message: `Not able to join ${ORGANIZATION_LOWER}`,
          description: response.reason,
          duration: 0,
        });
        appCtx.router.routeTo(U.dashboard({}));
      } else {
        appCtx.router.routeTo(U.org({ teamId: teamId }));
      }
    }
    const res = await appCtx.api.listTeamProjects(teamId);
    const databases = await appCtx.api.listCmsDatabasesForTeam(teamId);
    return { ...res, databases };
  }, [teamId, inviteId]);
  useAsyncStrict(fetchAsyncData, [teamId]);

  const team = asyncData?.value?.team;
  const numProjects = asyncData?.value?.projects.length || 0;
  const numMembers =
    asyncData?.value?.members.filter(
      (member) => !isAdminTeamEmail(member.email, appCtx.appConfig)
    ).length || 0;
  const workspaces = asyncData?.value?.workspaces || [];
  const perms = asyncData?.value?.perms || [];
  const unsortedProjects = asyncData?.value?.projects || [];
  const unsortedDatabases = asyncData?.value?.databases || [];

  React.useEffect(() => {
    if (!team) {
      return;
    }
    const storageKey = `plasmic.free-trial.${team.id}`;
    const hasFreeTrialStorage = async () => {
      const firstTimeRender = !(await appCtx.api.getStorageItem(storageKey));
      if (
        team.onTrial &&
        firstTimeRender &&
        appCtx.selfInfo?.id === team.createdById
      ) {
        setShowFreeTrialModal(true);
        await appCtx.api.addStorageItem(storageKey, "true");
      }
    };

    void hasFreeTrialStorage();
  }, [team]);

  const {
    projects,
    databases,
    matcher,
    props: filterProps,
  } = useProjectsFilter(unsortedProjects, unsortedDatabases);

  return (
    <>
      {documentTitle(team ? team.name : `Loading ${ORGANIZATION_LOWER}...`)}
      {showFreeTrialModal && (
        <FreeTrialModal
          trialDays={isNonNil(team?.trialDays) ? team!.trialDays : undefined}
          onConfirm={() => {
            setShowFreeTrialModal(false);
          }}
        />
      )}
      <PlasmicTeamPage
        root={{ ref }}
        defaultLayout={{
          wrapChildren: (children) =>
            !asyncData?.value ? <Spinner /> : children,
          helpButton: {
            props: {
              href: UU.orgSupport.fill({ teamId }),
            },
          },
        }}
        header={{
          team,
          perms,
          numMembers,
          numProjects,
          filterProps,
          onUpdate: async () => {
            await fetchAsyncData();
          },
        }}
        {...rest}
      >
        {workspaces.map((workspace) => (
          <WorkspaceSection
            key={workspace.id}
            workspace={workspace}
            databases={databases.filter((d) => d.workspaceId === workspace.id)}
            projects={projects.filter((p) => p.workspaceId === workspace.id)}
            onUpdate={async () => {
              await fetchAsyncData();
            }}
            perms={perms}
            matcher={matcher}
            inTeamPage={true}
          />
        ))}
      </PlasmicTeamPage>
    </>
  );
}

const TeamPage = React.forwardRef(TeamPage_);
export default TeamPage;
