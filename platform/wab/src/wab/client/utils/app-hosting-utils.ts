import { reportError } from "@/wab/client/ErrorNotifications";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
import { ApiBranch, ApiProject } from "@/wab/shared/ApiSchema";

export function getHostUrl(
  project: ApiProject,
  branch: ApiBranch | undefined,
  appConfig: DevFlagsType,
  fixHostOrigin: boolean = false
) {
  if (appConfig.ccStubs) {
    return appConfig.defaultHostUrl;
  }
  const urlString =
    DEVFLAGS.hostUrl ||
    branch?.hostUrl ||
    project.hostUrl ||
    appConfig.defaultHostUrl;
  const url = new URL(urlString);

  // We need to avoid redirects to different origins to avoid CORS errors when
  // fetching, so check for redirects that add/remove "www"
  if (fixHostOrigin && url.origin !== location.origin) {
    // Maybe a fancier check would be to remove all subdomains with
    // `parse-domain`: https://www.npmjs.com/package/parse-domain
    if (
      url.origin.replace("www.", "") !== location.origin.replace("www.", "")
    ) {
      // Log if it's an "unexpected" redirect
      reportError(
        new Error(
          `hostUrl has different origin than location.origin: ${url.origin} / ${location.origin}`
        )
      );
    }
    return urlString.replace(url.origin, location.origin);
  }

  return urlString;
}

export function maybeToggleTrailingSlash(doToggle: boolean, hostUrl: string) {
  if (!doToggle) {
    return hostUrl;
  }
  if (hostUrl.endsWith("/")) {
    return hostUrl.slice(0, -1);
  } else {
    return hostUrl + "/";
  }
}
