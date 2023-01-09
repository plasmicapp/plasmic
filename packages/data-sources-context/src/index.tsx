import React from 'react';

export interface PlasmicDataSourceContextValue {
  userAuthToken?: string;
  isUserLoading?: boolean;
  user?: {
    id: string;
    email: string;
    roleId: string;
    properties: Record<string, unknown> | null;
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
