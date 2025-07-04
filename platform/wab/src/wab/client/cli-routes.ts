/** @format */

import { latestTag } from "@/wab/commons/semver";
import { encodeUriParams } from "@/wab/commons/urls";
import { ArenaType, MainBranchId, isArenaType } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Route, fillRoute } from "@/wab/shared/route/route";
import { getPublicUrl } from "@/wab/shared/urls";
import {
  History,
  Location,
  LocationDescriptor,
  LocationDescriptorObject,
  createPath,
} from "history";
import { trimStart } from "lodash";
import { match as Match, matchPath, useRouteMatch } from "react-router-dom";

type XMatch<T> = Match<any> & {
  params: T;
};

export function parseRoute<PathParams extends {}>(
  route: Route<PathParams>,
  path: string = location.pathname,
  exact = true
): XMatch<PathParams> | null {
  // We use `any` here because react-router actually does support /:foo* and /:bar+ but this isn't reflected in the types.
  const match = matchPath<any>(path, {
    path: route.pattern,
    exact,
  });
  if (!match) {
    return null;
  }

  // React Router matchPath doesn't decode even though it encodes, so we manually decode here.
  const encodedParams: PathParams = match.params;
  const decodedParams: PathParams = Object.fromEntries(
    Object.entries(encodedParams).map(([k, v]) => [
      k,
      typeof v === "string" ? decodeURIComponent(v) : v,
    ])
  ) as unknown as PathParams;
  return {
    ...match,
    params: decodedParams,
  };
}

export function isProjectPath(pathname: string) {
  return !!(
    parseRoute(APP_ROUTES.project, pathname) ||
    parseRoute(APP_ROUTES.projectSlug, pathname)
  );
}

export const SEARCH_PARAM_BRANCH = "branch";
const SEARCH_PARAM_VERSION = "version";
const SEARCH_PARAM_ARENA_TYPE = "arena_type";
const SEARCH_PARAM_ARENA = "arena";

export interface ProjectLocationParams {
  projectId: string;
  slug: string | undefined;
  branchName: MainBranchId | string;
  branchVersion: typeof latestTag | string;
  arenaType: ArenaType | undefined;
  arenaUuidOrNameOrPath: string | undefined;
  isPreview?: boolean;
}

export function parseProjectLocation(
  location: Location
): ProjectLocationParams | undefined {
  const searchParams = new URLSearchParams(location.search);
  let branchName = searchParams.get(SEARCH_PARAM_BRANCH) || MainBranchId;
  const branchVersion = searchParams.get(SEARCH_PARAM_VERSION) || latestTag;
  const arenaTypeString = searchParams.get(SEARCH_PARAM_ARENA_TYPE);
  const arenaType = isArenaType(arenaTypeString) ? arenaTypeString : undefined;
  const arenaUuidOrNameOrPath =
    searchParams.get(SEARCH_PARAM_ARENA) || undefined;

  const matchProject = parseRoute(APP_ROUTES.project, location.pathname);
  if (matchProject) {
    return {
      projectId: matchProject.params.projectId,
      slug: undefined,
      branchName,
      branchVersion,
      arenaType,
      arenaUuidOrNameOrPath,
    };
  }

  const matchProjectSlug = parseRoute(
    APP_ROUTES.projectSlug,
    location.pathname
  );
  if (matchProjectSlug) {
    return {
      projectId: matchProjectSlug.params.projectId,
      slug: matchProjectSlug.params.slug,
      branchName,
      branchVersion,
      arenaType,
      arenaUuidOrNameOrPath,
    };
  }

  const matchProjectPreview = parseRoute(
    APP_ROUTES.projectPreview,
    location.pathname
  );
  if (matchProjectPreview) {
    const hashParams = new URLSearchParams(trimStart(location.hash, "#"));
    branchName = hashParams.get(SEARCH_PARAM_BRANCH) || MainBranchId;
    const previewPath = matchProjectPreview.params.previewPath || "";
    return {
      projectId: matchProjectPreview.params.projectId,
      slug: undefined,
      arenaType: undefined,
      branchName,
      branchVersion: latestTag,
      arenaUuidOrNameOrPath: previewPath,
      isPreview: true,
    };
  }

  return undefined;
}

export function mkProjectLocation({
  projectId,
  slug,
  branchName,
  branchVersion,
  arenaType,
  arenaUuidOrNameOrPath,
}: ProjectLocationParams): LocationDescriptorObject {
  const searchParams: [string, string][] = [];
  if (branchName !== MainBranchId) {
    searchParams.push([SEARCH_PARAM_BRANCH, branchName]);
  }
  if (branchVersion !== latestTag) {
    searchParams.push([SEARCH_PARAM_VERSION, branchVersion]);
  }
  if (arenaType) {
    searchParams.push([SEARCH_PARAM_ARENA_TYPE, arenaType]);
  }
  if (arenaUuidOrNameOrPath) {
    searchParams.push([SEARCH_PARAM_ARENA, arenaUuidOrNameOrPath]);
  }
  const search =
    searchParams.length === 0 ? undefined : "?" + encodeUriParams(searchParams);
  const pathname = slug
    ? fillRoute(APP_ROUTES.projectSlug, {
        projectId,
        slug,
      })
    : fillRoute(APP_ROUTES.project, {
        projectId,
      });

  return {
    pathname,
    search,
  };
}

export function openNewTab(location: LocationDescriptor) {
  window.open(
    typeof location === "string" ? location : createPath(location),
    "_blank"
  );
}

export class Router {
  constructor(public history: History) {}
  routeTo(path: string) {
    if (path.startsWith("//") || path.startsWith("https:")) {
      document.location.href = path;
    }
    this.history.push(path);
  }
}

export function getRouteContinuation() {
  const nextPath = location.pathname;

  // Strip the ?origin= param from the continuation's query params.
  const parsedSearch = new URLSearchParams(location.search);
  parsedSearch.delete("origin");
  parsedSearch.delete("isProd");
  let mungedSearch = parsedSearch.toString();
  if (mungedSearch) {
    mungedSearch = "?" + mungedSearch;
  }

  const continueTo = nextPath + mungedSearch + location.hash;
  return continueTo;
}

export function getLoginRouteWithContinuation() {
  const continueTo = getRouteContinuation();
  return fillRoute(APP_ROUTES.login, {}, { continueTo });
}

export function getEmaiLVerificationRouteWithContinuation() {
  const continueTo = getRouteContinuation();
  return fillRoute(APP_ROUTES.emailVerification, {}, { continueTo });
}

export function isPlasmicPath(pathname: string) {
  if (!pathname.startsWith("/")) {
    const _url = new URL(pathname);
    if (_url.origin !== origin) {
      return false;
    }
    pathname = _url.pathname;
  } else {
    // Exclude search
    pathname = new URL(origin + pathname).pathname;
  }
  return Object.values(APP_ROUTES).some((route: Route) =>
    parseRoute(route, pathname)
  );
}

export function isTopFrame(): boolean {
  return (
    window.origin === getPublicUrl() ||
    DEVFLAGS.topFrameUrls.includes(window.origin)
  );
}

export function ensureIsTopFrame() {
  ensure(isTopFrame(), "not in top frame");
}

export function isHostFrame() {
  return !isTopFrame();
}

export function ensureIsHostFrame() {
  ensure(isHostFrame(), "not in host frame");
}

export function useRRouteMatch<PathParams extends {}>(
  route: Route<PathParams>
) {
  return useRouteMatch<PathParams>(route.pattern);
}
