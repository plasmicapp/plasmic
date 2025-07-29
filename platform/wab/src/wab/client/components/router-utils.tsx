import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
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

type RouterRedirectPropsBase<PathParams extends {}> = Omit<
  RouterRouteProps<PathParams>,
  "children" | "component" | "render"
>;

export type RouterRedirectProps<PathParams extends {}> =
  RouterRedirectPropsBase<PathParams> & {
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

export type RouterRedirectAsyncProps<PathParams extends {}> =
  RouterRedirectPropsBase<PathParams> & {
    to: (props: RouteComponentProps<PathParams>) => Promise<string>;
  };

/** Redirect to a URL that is asynchronously computed. */
export function routerRedirectAsync<PathParams extends {}>({
  path,
  to,
  ...props
}: RouterRedirectAsyncProps<PathParams>) {
  return routerRoute({
    path,
    render: (routeProps: RouteComponentProps<PathParams>) => {
      return <RedirectAsync to={() => to(routeProps)} />;
    },
    ...props,
  });
}

/** Like react-router Redirect, but the URL is asynchronously computed. */
function RedirectAsync(props: { to: () => Promise<string> }) {
  const { value: url } = useAsyncStrict(props.to, []);
  if (!url) {
    return null;
  } else if (url?.startsWith("https://")) {
    // External URLs aren't handled by react-router Redirect.
    window.location.href = url;
    return null;
  } else {
    return <Redirect to={url} />;
  }
}
