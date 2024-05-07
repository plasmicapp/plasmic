import { ensureTruthy } from "@/wab/common";
import L from "lodash";
import urljoin from "url-join";
import pkg from "../../package.json";

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

export function getPublicUrl() {
  // PUBLIC_URL is always set to "", so dev-server.bash passes in REACT_APP_PUBLIC_URL, otherwise default to the homepage in package.json.
  return ensureTruthy(process.env.REACT_APP_PUBLIC_URL || pkg.homepage).replace(
    /\/$/,
    ""
  );
}

export function getCodegenUrl() {
  return process.env.CODEGEN_HOST || getPublicUrl();
}

export function getCdnUrl() {
  // backend-server.bash sets this to localhost; else uses pkg.homepage
  // TODO: in production, set up and point to actual CDN host
  return ensureTruthy(process.env.REACT_APP_CDN_URL || pkg.homepage).replace(
    /\/$/,
    ""
  );
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
