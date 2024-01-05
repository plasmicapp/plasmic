import { UU } from "@/wab/client/cli-routes";
import { ensure, unexpected } from "@/wab/common";
import { TeamId } from "@/wab/shared/ApiSchema";
import React, { useCallback, useContext, useMemo } from "react";
import { useHistory } from "react-router";

interface AdminState {
  /** Active tab on AdminPage. */
  tab: string;
  /** Selected team ID. */
  teamId: TeamId | undefined;
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
  const history = useHistory();
  const pathname = history.location.pathname;
  const state = useMemo<AdminState>(() => {
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
    [history, state]
  );

  return (
    <AdminCtxContext.Provider value={{ ...state, navigate }}>
      {children}
    </AdminCtxContext.Provider>
  );
}
