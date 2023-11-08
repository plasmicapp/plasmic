import { Request, Response } from "express-serve-static-core";
import { pick } from "lodash";
import { ensureType } from "../../common";
import { TrustedHostsListResponse } from "../../shared/ApiSchema";
import { userDbMgr } from "./util";

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
