import { svgoProcess } from "@/wab/server/svgo";
import { ProcessSvgRequest } from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";

export async function processSvgRoute(req: Request, res: Response) {
  const { svgXml }: ProcessSvgRequest = req.body;
  const response = svgoProcess(svgXml);
  res.json(response);
}
