import DefaultLayout, {
  DashboardNav,
} from "@/wab/client/components/dashboard/DefaultLayout";
import { Spinner } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useMatchedRoute } from "@/wab/client/route/useMatchedRoute";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { observer } from "mobx-react";
import * as React from "react";

interface DashboardLayoutProps {
  activeNav?: DashboardNav;
  children: React.ReactNode;
}

function DashboardLayout_({ activeNav, children }: DashboardLayoutProps) {
  const appCtx = useAppCtx();
  const pathname = useMatchedRoute()?.location.pathname;
  const orgParams = useMatchedRoute(APP_ROUTES.org)?.pathParams;
  const workspaceParams = useMatchedRoute(APP_ROUTES.workspace)?.pathParams;

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const workspace =
    workspaceParams &&
    appCtx.workspaces.find((w) => w.id === workspaceParams.workspaceId);
  const team = orgParams
    ? appCtx.getAllTeams().find((t) => t.id === orgParams.teamId)
    : workspace?.team;

  return (
    <DefaultLayout team={team} workspace={workspace} activeNav={activeNav}>
      <React.Suspense fallback={<Spinner />}>{children}</React.Suspense>
    </DefaultLayout>
  );
}

const DashboardLayout = observer(DashboardLayout_);
export default DashboardLayout;
