import React from 'react';

export interface PlasmicDataSourceContextValue {
  userAuthToken?: string;
  isUserLoading?: boolean;
  user?: {
    email: string;
    properties: Record<string, unknown> | null;
    roleId: string;
    roleName: string;
    roleIds: string[];
    roleNames: string[];
  };
}

const PlasmicDataSourceContext = React.createContext<
  PlasmicDataSourceContextValue | undefined
>(undefined);

export function usePlasmicDataSourceContext() {
  return React.useContext(PlasmicDataSourceContext);
}

export function useCurrentUser() {
  const ctx = usePlasmicDataSourceContext();
  return ctx?.user;
}

export const PlasmicDataSourceContextProvider =
  PlasmicDataSourceContext.Provider;
