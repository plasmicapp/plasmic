import { Request, Response } from "express-serve-static-core";
import { ensureType } from "../../common";
import { UsersResponse } from "../../shared/ApiSchema";
import { userDbMgr } from "./util";

export async function getUsersById(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const users = await mgr.tryGetUsersById(req.params.userIds.split(","));
  res.json(ensureType<UsersResponse>({ users }));
}
