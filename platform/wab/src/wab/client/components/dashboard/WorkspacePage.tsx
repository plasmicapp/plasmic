import DefaultTeamLayout from "@/wab/client/components/dashboard/DefaultTeamLayout";
import { documentTitle } from "@/wab/client/components/dashboard/page-utils";
import { Spinner } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import { useProjectsFilter } from "@/wab/client/hooks/useProjectsFilter";
import {
  DefaultWorkspacePageProps,
  PlasmicWorkspacePage,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicWorkspacePage";
import { Redirect } from "@/wab/client/route/Redirect";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { uniqBy } from "lodash";
import * as React from "react";

interface WorkspacePageProps extends Omit<
  DefaultWorkspacePageProps,
  "children" | "title"
> {
  workspaceId: WorkspaceId;
}

function WorkspacePage_(
  props: WorkspacePageProps,
  ref: HTMLElementRefOf<"div">,
) {
  const appCtx = useAppCtx();
  const { workspaceId, ...rest } = props;

  const [asyncData, fetchAsyncData] = useAsyncFnStrict(async () => {
    const { workspace, perms: workspacePerms } =
      await appCtx.api.getWorkspace(workspaceId);
    const { projects, perms: projectsPerms } = await appCtx.api.getProjects({
      query: "byWorkspace",
      workspaceId,
    });
    const databases =
      await appCtx.api.listCmsDatabasesForWorkspace(workspaceId);
    const perms = uniqBy([...workspacePerms, ...projectsPerms], (p) => p.id);
    return { workspace, projects, databases, perms };
  }, [workspaceId]);
  useAsyncStrict(fetchAsyncData, [workspaceId]);

  const {
    projects,
    databases,
    matcher,
    props: filterProps,
  } = useProjectsFilter(
    asyncData.value?.projects,
    asyncData.value?.databases,
    false,
  );

  if (asyncData.error) {
    // Deleted workspace, or one the user can't access.
    return <Redirect to={APP_ROUTES.dashboard.fill({})} />;
  }

  const data = asyncData.value;
  if (!data) {
    return (
      <>
        {documentTitle("Loading workspace...")}
        <Spinner />
      </>
    );
  }

  const { workspace, perms } = data;
  return (
    <>
      {documentTitle(workspace.name)}
      <PlasmicWorkspacePage
        root={{ ref }}
        defaultLayout={{
          as: DefaultTeamLayout,
          props: { team: workspace.team, workspace },
        }}
        workspaceSection={{
          props: {
            workspace,
            projects,
            databases,
            onUpdate: async () => {
              await fetchAsyncData();
            },
            perms,
            matcher,
            filterProps,
          },
        }}
        {...rest}
      />
    </>
  );
}

const WorkspacePage = React.forwardRef(WorkspacePage_);
export default WorkspacePage;
