import { useLocation } from "@/wab/client/route/HistoryProvider";
import { MatchedRouteContext } from "@/wab/client/route/useMatchedRoute";
import { ensureArray, spanLast } from "@/wab/shared/common";
import { Route } from "@/wab/shared/route/route";
import * as React from "react";

interface SwitchCase<PathParams> {
  route: Route<PathParams> | Route<PathParams>[];
  exact?: boolean;
  render: (pathParams: PathParams) => React.ReactNode;
}

/** Helper function that helps infer params. */
export function switchCase<PathParams extends {}>(
  matchCase: SwitchCase<PathParams>
): SwitchCase<PathParams> {
  return matchCase;
}

interface SwitchDefault {
  render: () => React.ReactNode;
}

export function switchDefault(defaultCase: SwitchDefault): SwitchDefault {
  return defaultCase;
}

export interface SwitchProps {
  cases: [...SwitchCase<any>[], SwitchDefault];
}

export function Switch({ cases }: SwitchProps) {
  const [matchCases, defaultCase] = spanLast(cases);

  const location = useLocation();
  for (const matchCase of matchCases) {
    for (const route of ensureArray(matchCase.route)) {
      const pathParams = route.parse(
        location.pathname,
        matchCase.exact ?? false
      );
      if (pathParams) {
        return (
          <MatchedRouteContext.Provider value={{ location, route, pathParams }}>
            {matchCase.render(pathParams)}
          </MatchedRouteContext.Provider>
        );
      }
    }
  }

  return defaultCase.render();
}
