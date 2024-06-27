import { ensureType } from "@/wab/shared/common";
import { userDbMgr } from "@/wab/server/routes/util";
import { TrustedHostsListResponse } from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";
import { pick } from "lodash";

export async function getTrustedHostsForSelf(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const hosts = await mgr.listTrustedHostsForSelf();
  res.json(
    ensureType<TrustedHostsListResponse>({
      trustedHosts: hosts.map((host) => pick(host, "id", "hostUrl")),
    })
  );
}

export async function addTrustedHost(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { url } = req.body;
  await mgr.addTrustedHost(url);
  res.json({});
}

export async function deleteTrustedHost(req: Request, res: Response) {
  const { trustedHostId } = req.params;
  const mgr = userDbMgr(req);
  await mgr.deleteTrustedHost(trustedHostId);
  res.json({});
}
