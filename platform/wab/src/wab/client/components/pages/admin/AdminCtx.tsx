import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { AsyncState, useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { useHistory } from "@/wab/client/route/HistoryProvider";
import { ApiFeatureTier, ApiUser, TeamId } from "@/wab/shared/ApiSchema";
import { ensure, unexpected } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import React, { useCallback, useContext, useMemo } from "react";

interface AdminState {
  /** Active tab on AdminPage; undefined at the bare /admin route. */
  tab: string | undefined;
  /** Selected team ID. */
  teamId: TeamId | undefined;
  /** State for listing all users. */
  listUsers: AsyncState<ApiUser[]>;
  /** State for listing all feature tiers. */
  listFeatureTiers: AsyncState<ApiFeatureTier[]>;
}

interface AdminActions {
  navigate(to: { tab: string; id?: TeamId }): void;
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
    const matchesTeams = APP_ROUTES.adminTeams.parse(pathname);
    if (matchesTeams) {
      return {
        tab: "teams",
        teamId: matchesTeams.teamId,
      };
    }

    const matchesAdmin = APP_ROUTES.admin.parse(pathname);
    if (matchesAdmin) {
      return {
        tab: matchesAdmin.tab,
        teamId: undefined,
      };
    }

    unexpected();
  }, [pathname]);

  const navigate = useCallback<AdminActions["navigate"]>(
    ({ tab, id }) => {
      if (tab === "teams") {
        history.push(APP_ROUTES.adminTeams.fill({ teamId: id }));
      } else {
        history.push(APP_ROUTES.admin.fill({ tab }));
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
