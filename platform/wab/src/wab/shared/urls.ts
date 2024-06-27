import { ensure, ensureTruthy } from "@/wab/shared/common";
import L from "lodash";
import urljoin from "url-join";

export const baseDomain = () => {
  const loc = window?.location;
  if (loc) {
    const url = new URL(loc.toString());
    url.hash = "";
    url.search = "";
    // Despite we set pathname to "", toString still yields the ending "/".
    url.pathname = "";
    const fullUrl = url.toString();
    return fullUrl.endsWith("/")
      ? fullUrl.slice(0, fullUrl.length - 1)
      : fullUrl;
  }
  return "http://localhost:3003";
};

export const userContentDomain = (siteInstSubdomain) =>
  `http://${siteInstSubdomain}.vcap.me:3003`;

export const userContentUrl = (siteInstSubdomain, fileId) =>
  urljoin(userContentDomain(siteInstSubdomain), encodeURIComponent(fileId));

export function userImgUrl(siteInstSubdomain?, fileId?) {
  if (siteInstSubdomain == null) {
    siteInstSubdomain = "";
  }
  if (fileId == null) {
    fileId = "";
  }
  if (fileId !== "") {
    return userContentUrl(siteInstSubdomain, fileId);
  } else {
    return placeholderImgUrl();
  }
}

export const globalStatic = (path) => urljoin(getPublicUrl(), "static", path);

export function placeholderImgUrl(isIcon?: boolean) {
  return isIcon
    ? globalStatic("img/icon_placeholder.svg")
    : globalStatic("img/placeholder.png");
}

let PUBLIC_URL: string | undefined = undefined;

export function getPublicUrl() {
  if (PUBLIC_URL === undefined) {
    if (typeof window !== "undefined") {
      PUBLIC_URL = maybeGetPlasmicStudioOrigin() ?? window.location.origin;
    } else {
      PUBLIC_URL = process.env.REACT_APP_PUBLIC_URL ?? "http://localhost:3003";
    }
  }
  return ensureTruthy(PUBLIC_URL!).replace(/\/$/, "");
}

export function getCodegenUrl() {
  return process.env.CODEGEN_HOST || getPublicUrl();
}

export function getIntegrationsUrl() {
  return process.env.INTEGRATIONS_HOST || getPublicUrl();
}

export function extractProjectIdFromUrlOrId(rawProjectUrlOrId: string) {
  const trimmedUrlOrId = rawProjectUrlOrId.trim();
  const match = new RegExp(
    `^${L.escapeRegExp(`${getPublicUrl()}/projects/`)}([\\w_-]+)`
  ).exec(trimmedUrlOrId);

  const projectId = match?.[1] ?? trimmedUrlOrId;
  return projectId;
}

export function createProjectUrl(host: string, projectId: string) {
  return `${host}/projects/${projectId}`;
}

export function createWorkspaceUrl(host: string, workspaceId: string) {
  return `${host}/workspaces/${workspaceId}`;
}

export function createTeamUrl(host: string, teamId: string) {
  return `${host}/teams/${teamId}`;
}

/** Get params passed from top frame to host frame. */
function maybeGetPlasmicStudioOrigin(): string | undefined {
  const hash = (window as any).__PlasmicStudioArgs;
  if (!hash) {
    return undefined;
  }
  const params = new URLSearchParams(hash.replace(/^#/, "?"));
  return ensure(
    params.get("origin"),
    "Missing origin hash param in host frame"
  );
}
