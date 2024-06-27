import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { UU } from "@/wab/client/cli-routes";
import { AsyncState, useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { ensure, unexpected } from "@/wab/shared/common";
import { ApiFeatureTier, ApiUser, TeamId } from "@/wab/shared/ApiSchema";
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
    const matchesTeams = UU.adminTeams.parse(pathname);
    if (matchesTeams) {
      return {
        tab: "teams",
        teamId: matchesTeams.params.teamId,
      };
    }

    const matchesAdmin = UU.admin.parse(pathname);
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
        history.push(UU.adminTeams.fill({ teamId: id }));
      } else {
        history.push(UU.admin.fill({ tab }));
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
