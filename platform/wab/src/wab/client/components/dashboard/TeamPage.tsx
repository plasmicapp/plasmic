import { freeTrialKey } from "@/wab/client/LocalStorageKey";
import DefaultTeamLayout from "@/wab/client/components/dashboard/DefaultTeamLayout";
import FreeTrialModal from "@/wab/client/components/dashboard/FreeTrialModal";
import WorkspaceSection from "@/wab/client/components/dashboard/WorkspaceSection";
import { documentTitle } from "@/wab/client/components/dashboard/page-utils";
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
import { Redirect } from "@/wab/client/route/Redirect";
import {
  ApiCmsDatabase,
  ListTeamProjectsResponse,
  TeamId,
} from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { isNonNil } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import * as React from "react";

interface TeamPageProps extends DefaultTeamPageProps {
  teamId: TeamId;
}

type TeamPageData = ListTeamProjectsResponse & {
  databases: ApiCmsDatabase[];
};

function TeamPage_(props: TeamPageProps, ref: HTMLElementRefOf<"div">) {
  const appCtx = useAppCtx();
  const { teamId, ...rest } = props;
  const inviteId = new URL(location.href).searchParams.get("inviteId") ?? "";

  const [asyncData, fetchAsyncData] = useAsyncFnStrict(async (): Promise<
    TeamPageData | undefined
  > => {
    if (inviteId) {
      const response = await appCtx.api.joinTeam({ teamId, inviteId });
      if (!response.status) {
        notification.error({
          message: `Not able to join ${ORGANIZATION_LOWER}`,
          description: response.reason,
          duration: 0,
        });
        appCtx.router.routeTo(APP_ROUTES.dashboard.fill({}));
        return undefined;
      }
      // Make sure the sidebar knows about the newly joined org.
      await appCtx.reloadAppCtx();
      appCtx.router.routeTo(APP_ROUTES.org.fill({ teamId }));
    }
    const res = await appCtx.api.listTeamProjects(teamId);
    const databases = await appCtx.api.listCmsDatabasesForTeam(teamId);
    return { ...res, databases };
  }, [teamId, inviteId]);
  useAsyncStrict(fetchAsyncData, [teamId]);

  if (asyncData.error) {
    // Deleted org, or one the user can't access.
    return <Redirect to={APP_ROUTES.dashboard.fill({})} />;
  }

  const data = asyncData.value;
  if (!data) {
    return (
      <>
        {documentTitle(`Loading ${ORGANIZATION_LOWER}...`)}
        <Spinner />
      </>
    );
  }

  return (
    <TeamPageContent
      {...rest}
      ref={ref}
      data={data}
      onUpdate={async () => {
        await fetchAsyncData();
      }}
    />
  );
}

interface TeamPageContentProps extends DefaultTeamPageProps {
  data: TeamPageData;
  onUpdate: () => Promise<void>;
}

function TeamPageContent_(
  props: TeamPageContentProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const { data, onUpdate, ...rest } = props;
  const { team, perms, members, workspaces } = data;
  const [showFreeTrialModal, setShowFreeTrialModal] = React.useState(false);

  const numProjects = data.projects.length;
  const numMembers = members.filter(
    (member) => !isAdminTeamEmail(member.email, appCtx.appConfig)
  ).length;

  React.useEffect(() => {
    const storageKey = freeTrialKey(team.id);
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
  } = useProjectsFilter(data.projects, data.databases);

  return (
    <>
      {documentTitle(team.name)}
      {showFreeTrialModal && (
        <FreeTrialModal
          trialDays={isNonNil(team.trialDays) ? team.trialDays : undefined}
          onConfirm={() => {
            setShowFreeTrialModal(false);
          }}
        />
      )}
      <PlasmicTeamPage
        root={{ ref }}
        defaultLayout={{
          as: DefaultTeamLayout,
          props: { team },
        }}
        header={{
          team,
          perms,
          numMembers,
          numProjects,
          filterProps,
          onUpdate,
        }}
        {...rest}
      >
        {workspaces.map((workspace) => (
          <WorkspaceSection
            key={workspace.id}
            workspace={workspace}
            databases={databases.filter((d) => d.workspaceId === workspace.id)}
            projects={projects.filter((p) => p.workspaceId === workspace.id)}
            onUpdate={onUpdate}
            perms={perms}
            matcher={matcher}
            inTeamPage={true}
          />
        ))}
      </PlasmicTeamPage>
    </>
  );
}

const TeamPageContent = React.forwardRef(TeamPageContent_);

const TeamPage = React.forwardRef(TeamPage_);
export default TeamPage;
