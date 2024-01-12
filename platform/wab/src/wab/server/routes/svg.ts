import { ForbiddenError } from "@/wab/server/db/DbMgr";
import { svgoProcess } from "@/wab/server/svgo";
import { ProcessSvgRequest } from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";
import { hasUser } from "./util";

export async function processSvgRoute(req: Request, res: Response) {
  if (!hasUser(req)) {
    throw new ForbiddenError("This action requires a logged in user");
  }
  const { svgXml }: ProcessSvgRequest = req.body;
  const response = svgoProcess(svgXml);
  res.json(response);
}
