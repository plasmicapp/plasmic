import { compile, PathFunction } from "path-to-regexp";
import { ParsedUrlQueryInput } from "querystring";
import url from "url";

export type Route<PathParams = {}> = {
  pattern: string;
  pathFunction: PathFunction;
};

export function route<PathParams = {}>(pattern: string): Route<PathParams> {
  // TODO: compile-time validate the URL to check the path params match
  return {
    pattern,
    pathFunction: compile(pattern),
  };
}

export function fillRoute<PathParams extends {}>(
  r: Route<PathParams>,
  pathParams: PathParams,
  query?: string | ParsedUrlQueryInput
): string {
  const filledPathname = r.pathFunction(pathParams);
  return url.format({
    pathname: filledPathname,
    query,
  });
}
