import React from 'react';

export interface PlasmicDataSourceContextValue {
  userAuthToken?: string;
}

const PlasmicDataSourceContext = React.createContext<
  PlasmicDataSourceContextValue | undefined
>(undefined);

export function usePlasmicDataSourceContext() {
  return React.useContext(PlasmicDataSourceContext);
}

export const PlasmicDataSourceContextProvider =
  PlasmicDataSourceContext.Provider;
