import { ForbiddenError } from "@/wab/server/db/DbMgr";
import { hasUser } from "@/wab/server/routes/util";
import { svgoProcess } from "@/wab/server/svgo";
import { ProcessSvgRequest } from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";

export async function processSvgRoute(req: Request, res: Response) {
  if (!hasUser(req)) {
    throw new ForbiddenError("This action requires a logged in user");
  }
  const { svgXml }: ProcessSvgRequest = req.body;
  const response = svgoProcess(svgXml);
  res.json(response);
}
