import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { parseRoute } from "@/wab/client/cli-routes";
import { AsyncState, useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { ApiFeatureTier, ApiUser, TeamId } from "@/wab/shared/ApiSchema";
import { ensure, unexpected } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import React, { useCallback, useContext, useMemo } from "react";
import { useHistory } from "react-router";

interface AdminState {
  /** Active tab on AdminPage. */
  tab: string;
  /** Selected team ID. */
  teamId: TeamId | undefined;
  /** State for listing all users. */
  listUsers: AsyncState<ApiUser[]>;
  /** State for listing all feature tiers. */
  listFeatureTiers: AsyncState<ApiFeatureTier[]>;
}

interface AdminActions {
  navigate(to: { tab: string; id?: string }): void;
}

export type AdminCtx = AdminState & AdminActions;

const AdminCtxContext = React.createContext<AdminCtx | undefined>(undefined);

export function useAdminCtx() {
  return ensure(
    useContext(AdminCtxContext),
    () => "AdminCtxProvider must be used"
  );
}

export function AdminCtxProvider({ children }: React.PropsWithChildren) {
  const nonAuthCtx = useNonAuthCtx();

  const history = useHistory();
  const pathname = history.location.pathname;
  const pathState = useMemo(() => {
    const matchesTeams = parseRoute(APP_ROUTES.adminTeams, pathname);
    if (matchesTeams) {
      return {
        tab: "teams",
        teamId: matchesTeams.params.teamId,
      };
    }

    const matchesAdmin = parseRoute(APP_ROUTES.admin, pathname);
    if (matchesAdmin) {
      return {
        tab: matchesAdmin.params.tab,
        teamId: undefined,
      };
    }

    unexpected();
  }, [pathname]);

  const navigate = useCallback<AdminActions["navigate"]>(
    ({ tab, id }) => {
      if (tab === "teams") {
        history.push(fillRoute(APP_ROUTES.adminTeams, { teamId: id }));
      } else {
        history.push(fillRoute(APP_ROUTES.admin, { tab }));
      }
    },
    [history, pathState]
  );

  const listUsers = useAsyncStrict(async () => {
    const res = await nonAuthCtx.api.listUsers();
    return res.users;
  }, [nonAuthCtx]);
  const listFeatureTiers = useAsyncStrict(async () => {
    const res = await nonAuthCtx.api.listAllFeatureTiers();
    return res.tiers;
  }, [nonAuthCtx]);

  return (
    <AdminCtxContext.Provider
      value={{
        ...pathState,
        navigate,
        listUsers,
        listFeatureTiers,
      }}
    >
      {children}
    </AdminCtxContext.Provider>
  );
}
