import { Route as RouteData } from "@/wab/shared/route/route";
import * as React from "react";
import {
  Redirect,
  Route,
  RouteChildrenProps,
  RouteComponentProps,
  RouteProps,
} from "react-router";
import type { OverrideProperties } from "type-fest";

export type RouterRouteProps<PathParams extends {}> = OverrideProperties<
  RouteProps,
  {
    path: RouteData<PathParams>;
    children?:
      | ((props: RouteChildrenProps<PathParams>) => React.ReactNode)
      | React.ReactNode;
    component?:
      | React.ComponentType<RouteComponentProps<PathParams>>
      | React.ComponentType<PathParams>;
    render?: (props: RouteComponentProps<PathParams>) => React.ReactNode;
  }
>;

/**
 * Type-safe replacement for react-router Route that works with our Route type.
 *
 * This function can't be used as a React component with JSX because
 * react-router expects its direct children to be its Route component.
 */
export function routerRoute<PathParams extends {}>({
  path,
  ...props
}: RouterRouteProps<PathParams>) {
  return <Route path={path.pattern} {...props} />;
}

export type RouterRedirectProps<PathParams extends {}> = Omit<
  RouterRouteProps<PathParams>,
  "children" | "component" | "render"
> & {
  to: (props: RouteComponentProps<PathParams>) => string;
};

/**
 * Type-safe replacement for react-router Redirect that works with our Route type.
 *
 * This function can't be used as a React component with JSX because
 * react-router expects its direct children to be its Route component.
 */
export function routerRedirect<PathParams extends {}>({
  path,
  to,
  ...props
}: RouterRedirectProps<PathParams>) {
  return routerRoute({
    path,
    render: (routeProps: RouteComponentProps<PathParams>) => {
      return <Redirect to={to(routeProps)} />;
    },
    ...props,
  });
}
