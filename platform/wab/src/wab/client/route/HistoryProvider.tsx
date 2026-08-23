import { ensure } from "@/wab/shared/common";
import { History, Location } from "history";
import * as React from "react";

const HistoryContext = React.createContext<History | undefined>(undefined);
const LocationContext = React.createContext<Location | undefined>(undefined);

/**
 * Provider for {@link useHistory} and {@link useLocation}.
 */
export function HistoryProvider({
  history,
  children,
}: {
  history: History;
  children: React.ReactNode;
}) {
  const location = React.useSyncExternalStore(
    React.useCallback((onChange) => history.listen(onChange), [history]),
    () => history.location
  );
  return (
    <HistoryContext.Provider value={history}>
      <LocationContext.Provider value={location}>
        {children}
      </LocationContext.Provider>
    </HistoryContext.Provider>
  );
}

export function useHistory(): History {
  return ensure(React.useContext(HistoryContext), "missing history");
}

export function useLocation(): Location {
  return ensure(React.useContext(LocationContext), "missing location");
}
