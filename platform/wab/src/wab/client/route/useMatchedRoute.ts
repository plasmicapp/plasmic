import { Route } from "@/wab/shared/route/route";
import { Location } from "history";
import * as React from "react";

export type MatchedRoute<PathParams> = {
  location: Location;
  route: Route<PathParams>;
  pathParams: PathParams;
};

export const MatchedRouteContext = React.createContext<
  MatchedRoute<unknown> | undefined
>(undefined);

/**
 * Returns the route matched by the enclosing Switch.
 * If a route is provided, it must prefix-match the location instead.
 */
export function useMatchedRoute<PathParams extends {}>(
  route?: Route<PathParams>
): MatchedRoute<PathParams> | undefined {
  const matchedRoute = React.useContext(MatchedRouteContext);
  return React.useMemo(() => {
    if (!matchedRoute || !route || route === matchedRoute.route) {
      return matchedRoute as MatchedRoute<PathParams> | undefined;
    }

    const pathParams = route.parse(matchedRoute.location.pathname, false);
    return pathParams
      ? { location: matchedRoute.location, route, pathParams }
      : undefined;
  }, [matchedRoute, route]);
}
