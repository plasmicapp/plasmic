import { unbundlePkgVersion } from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { fetchUntrusted, UnsafeUrlError } from "@/wab/server/util/url";
import { NotFoundError } from "@/wab/shared/ApiErrors/errors";
import { ApiProjectWebhook, ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { withoutNils } from "@/wab/shared/common";
import {
  compareSites,
  ExternalChangeData,
  getExternalChangeData,
} from "@/wab/shared/site-diffs";
import { AxiosError, Method } from "axios";
export async function triggerWebhook(
  mgr: DbMgr,
  projectId: string,
  webhook: Omit<ApiProjectWebhook, "id" | "includeChangeData">
) {
  const response = await triggerWebhookOnly(webhook);
  const method = webhook.method as Method;
  const url = webhook.url;
  return await addEvent(mgr, projectId, method, url, response);
}

export async function triggerWebhookOnly(
  webhook: Omit<ApiProjectWebhook, "id" | "includeChangeData">
) {
  const method = webhook.method as Method;
  const url = webhook.url;
  const payload = webhook.payload;

  const headers = {};
  for (const { key, value } of webhook.headers ?? []) {
    headers[key] = value;
  }

  let response: { status: number; data: string };
  try {
    const resp = await fetchUntrusted({
      method,
      url,
      headers,
      data: payload,
      // Don't follow redirects; a webhook should target a single endpoint.
      maxRedirects: 0,
      // Set a timeout (ms) to avoid hanging requests.
      timeout: 1000 * 10,
    });
    response = { status: resp.status, data: resp.data };
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      response = {
        status: 400,
        data: "Invalid URL",
      };
    } else if (error instanceof AxiosError) {
      response = {
        status: error.response?.status ?? 0,
        data: error.response?.data ?? "",
      };
    } else {
      throw error;
    }
  }
  return response;
}

async function addEvent(
  mgr: DbMgr,
  projectId: string,
  method: string,
  url: string,
  response: { status: number; data: string }
) {
  return await mgr.createProjectWebhookEvent({
    projectId,
    method,
    url,
    status: response?.status || 0,
    response: response?.data || "",
  });
}

export async function mkWebhookPagesModified(
  mgr: DbMgr,
  projectId: ProjectId
): Promise<ExternalChangeData> {
  const pkg = await mgr.getPkgByProjectId(projectId);
  if (!pkg) {
    return {
      importedProjectsChanged: [],
      pagesChanged: [],
    };
  }
  const latestPkgVersionIds = await mgr.getLatestPkgVersionIds(
    projectId,
    undefined,
    pkg?.id,
    2
  );
  if (latestPkgVersionIds.length !== 2) {
    return {
      importedProjectsChanged: [],
      pagesChanged: [],
    };
  }

  const sites = withoutNils(
    await Promise.all(
      latestPkgVersionIds.map(async (id) => {
        const bundler = new Bundler();
        const pkgVersion = await mgr.getPkgVersionById(id);
        if (!pkgVersion) {
          throw new NotFoundError(`PkgVersion ${id} not found`);
        }
        return (await unbundlePkgVersion(mgr, bundler, pkgVersion)).site;
      })
    )
  );

  if (sites.length !== 2) {
    return {
      importedProjectsChanged: [],
      pagesChanged: [],
    };
  }

  const changeLogs = compareSites(sites[1], sites[0]);

  return getExternalChangeData(changeLogs);
}
