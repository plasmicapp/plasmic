import React from "react";

export type GlobalActionDict = Record<string, Function>;

export const GlobalActionsContext = React.createContext<
  GlobalActionDict | undefined
>(undefined);

export function GlobalActionsProvider(props: {
  contextName: string;
  children?: React.ReactNode;
  actions: GlobalActionDict;
}) {
  const { contextName, children, actions } = props;
  const existingActions = useGlobalActions();
  const namespacedActions = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(actions).map(([key, val]) => [
          `${contextName}.${key}`,
          val,
        ])
      ),
    [contextName, actions]
  );
  return (
    <GlobalActionsContext.Provider
      value={{
        ...existingActions,
        ...namespacedActions,
      }}
    >
      {children}
    </GlobalActionsContext.Provider>
  );
}

export function useGlobalActions() {
  return React.useContext(GlobalActionsContext) ?? {};
}
