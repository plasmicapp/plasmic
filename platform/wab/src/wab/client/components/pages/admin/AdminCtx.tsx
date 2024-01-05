import { ensure } from "@/wab/common";
import { TeamId } from "@/wab/shared/ApiSchema";
import React, { useCallback, useContext, useState } from "react";

interface AdminState {
  /** Active tab key on AdminPage. */
  tabKey: string;
  /** Selected team ID. */
  teamId: TeamId | undefined;
}

interface AdminActions {
  setState(state: Partial<AdminState>): void;
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
  const [state, setState] = useState<AdminState>({
    tabKey: "users",
    teamId: undefined,
  });
  const setPartialState = useCallback((partialState: Partial<AdminState>) => {
    return setState((prevState) => ({ ...prevState, ...partialState }));
  }, []);
  return (
    <AdminCtxContext.Provider value={{ ...state, setState: setPartialState }}>
      {children}
    </AdminCtxContext.Provider>
  );
}
