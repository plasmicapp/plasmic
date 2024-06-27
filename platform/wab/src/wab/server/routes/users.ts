import { ensureType } from "@/wab/shared/common";
import { userDbMgr } from "@/wab/server/routes/util";
import { UsersResponse } from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";

export async function getUsersById(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const users = await mgr.tryGetUsersById(req.params.userIds.split(","));
  res.json(ensureType<UsersResponse>({ users }));
}
