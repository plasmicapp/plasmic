import { ensureInstance, ensureType } from "@/wab/common";
import "@/wab/server/extensions";
import { userAnalytics } from "@/wab/server/routes/util";
import { GetClipResponse } from "@/wab/shared/ApiSchema";
import S3 from "aws-sdk/clients/s3";
import { Request, Response } from "express-serve-static-core";

export async function getAppConfig(req: Request, res: Response) {
  const config = req.devflags;
  res.json({ config });
}

export async function putClip(req: Request, res: Response) {
  const { clipId } = req.params;
  const s3 = new S3();
  await s3
    .upload({ Bucket: "plasmic-clips", Key: clipId, Body: req.body.content })
    .promise();
  userAnalytics(req).track({
    event: "Figma put clip",
    properties: { size: req.body.content.length },
  });
  res.json({});
}

export async function getClip(req: Request, res: Response) {
  const { clipId } = req.params;
  const s3 = new S3();
  const result = await s3
    .getObject({
      Bucket: "plasmic-clips",
      Key: clipId,
    })
    .promise();
  const content = ensureInstance(result.Body, Buffer).toString("utf8");
  userAnalytics(req).track({
    event: "Figma get clip",
    properties: { size: content.length },
  });
  res.json(ensureType<GetClipResponse>({ content }));
}
