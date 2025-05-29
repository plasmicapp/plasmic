import { unbundlePkgVersion } from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { NotFoundError } from "@/wab/shared/ApiErrors/errors";
import { ApiProjectWebhook, ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { withoutNils } from "@/wab/shared/common";
import {
  compareSites,
  ExternalChangeData,
  getExternalChangeData,
} from "@/wab/shared/site-diffs";
import axios, { AddressFamily, Method } from "axios";
import dns from "dns";
import isPrivateIp from "private-ip";
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

  // Prevent reaching internal IPs.
  const hostname = new URL(url).hostname;
  const ip = await dns.promises.lookup(hostname);
  const isPrivate = isPrivateIp(ip.address);

  let response: { status: number; data: string };
  if (isPrivate) {
    response = {
      status: 500,
      data: "Hostname resolves to internal IP",
    };
  } else {
    try {
      const resp = await axios.request({
        method,
        url,
        headers,
        data: payload,
        // Disable redirects to avoid SSRF attacks.
        maxRedirects: 0,
        // Reuse the IP we already validated up before to avoid DNS attacks.
        lookup: (_hostname, _options, cb) => {
          cb(null, ip.address, ip.family as AddressFamily);
        },
        // Disable axios default transform to always get a string response.
        transformResponse: (res) => res,
      });
      response = { status: resp.status, data: resp.data };
    } catch (error) {
      response = {
        status: error.response?.status,
        data: error.response?.data,
      };
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
