import { latestTag } from "@/wab/commons/semver";
import { MainBranchId, isArenaType } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  APP_ROUTES,
  ProjectLocationParams,
  SEARCH_PARAM_ARENA,
  SEARCH_PARAM_ARENA_TYPE,
  SEARCH_PARAM_BRANCH,
  SEARCH_PARAM_COMMENT,
  SEARCH_PARAM_REVISION,
  SEARCH_PARAM_VERSION,
} from "@/wab/shared/route/app-routes";
import { Route } from "@/wab/shared/route/route";
import { getPublicUrl } from "@/wab/shared/urls";
import { History, Location, To, createPath } from "history";
import { trimStart } from "lodash";

export function isProjectPath(pathname: string) {
  return !!(
    APP_ROUTES.project.parse(pathname) || APP_ROUTES.projectSlug.parse(pathname)
  );
}

export function parseProjectLocation(
  location: Location
): ProjectLocationParams | undefined {
  const searchParams = new URLSearchParams(location.search);
  let branchName = searchParams.get(SEARCH_PARAM_BRANCH) || MainBranchId;
  const branchVersion = searchParams.get(SEARCH_PARAM_VERSION) || latestTag;
  const branchRevision = searchParams.get(SEARCH_PARAM_REVISION) || undefined;
  const arenaTypeString = searchParams.get(SEARCH_PARAM_ARENA_TYPE);
  const arenaType = isArenaType(arenaTypeString) ? arenaTypeString : undefined;
  const arenaUuidOrNameOrPath =
    searchParams.get(SEARCH_PARAM_ARENA) || undefined;
  const threadId = searchParams.get(SEARCH_PARAM_COMMENT) || undefined;

  const matchProject = APP_ROUTES.project.parse(location.pathname);
  if (matchProject) {
    return {
      projectId: matchProject.projectId,
      slug: undefined,
      branchName,
      branchVersion,
      branchRevision,
      arenaType,
      arenaUuidOrNameOrPath,
      threadId,
    };
  }

  const matchProjectSlug = APP_ROUTES.projectSlug.parse(location.pathname);
  if (matchProjectSlug) {
    return {
      projectId: matchProjectSlug.projectId,
      slug: matchProjectSlug.slug,
      branchName,
      branchVersion,
      branchRevision,
      arenaType,
      arenaUuidOrNameOrPath,
      threadId,
    };
  }

  const matchProjectPreview = APP_ROUTES.projectPreview.parse(
    location.pathname
  );
  if (matchProjectPreview) {
    const previewHashParams = new URLSearchParams(
      trimStart(location.hash, "#")
    );
    branchName = previewHashParams.get(SEARCH_PARAM_BRANCH) || MainBranchId;
    const previewPath = (matchProjectPreview.previewPath ?? []).join("/");
    return {
      projectId: matchProjectPreview.projectId,
      slug: undefined,
      arenaType: undefined,
      branchRevision: undefined,
      branchName,
      branchVersion: latestTag,
      arenaUuidOrNameOrPath: previewPath,
      isPreview: true,
    };
  }

  return undefined;
}

export function openNewTab(location: To) {
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
      return;
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
  return APP_ROUTES.login.fill({}, { continueTo });
}

export function getEmaiLVerificationRouteWithContinuation() {
  const continueTo = getRouteContinuation();
  return APP_ROUTES.emailVerification.fill({}, { continueTo });
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
    route.parse(pathname)
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
