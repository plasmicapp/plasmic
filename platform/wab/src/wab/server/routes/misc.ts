import "@/wab/server/extensions";
import { GetClipResponse } from "@/wab/shared/ApiSchema";
import { ensureInstance, ensureType } from "@/wab/shared/common";
import S3 from "aws-sdk/clients/s3";
import { Request, Response } from "express-serve-static-core";

const CLIP_BUCKET = process.env.CLIP_BUCKET ?? "plasmic-clips";

export async function getAppConfig(req: Request, res: Response) {
  const config = req.devflags;
  res.json({ config });
}

export async function putClip(req: Request, res: Response) {
  const { clipId } = req.params;
  const s3 = new S3({ endpoint: process.env.S3_ENDPOINT });
  await s3
    .upload({ Bucket: CLIP_BUCKET, Key: clipId, Body: req.body.content })
    .promise();
  req.analytics.track("Figma put clip", {
    size: req.body.content.length,
  });
  res.json({});
}

export async function getClip(req: Request, res: Response) {
  const { clipId } = req.params;
  const s3 = new S3({ endpoint: process.env.S3_ENDPOINT });
  const result = await s3
    .getObject({
      Bucket: CLIP_BUCKET,
      Key: clipId,
    })
    .promise();
  const content = ensureInstance(result.Body, Buffer).toString("utf8");
  req.analytics.track("Figma get clip", {
    size: content.length,
  });
  res.json(ensureType<GetClipResponse>({ content }));
}
