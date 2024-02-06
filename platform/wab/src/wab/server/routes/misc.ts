import {
  ensure,
  ensureInstance,
  ensureString,
  ensureType,
  omitNils,
} from "@/wab/common";
import "@/wab/server/extensions";
import { getDiscourseConnectSecret } from "@/wab/server/secrets";
import { GetClipResponse } from "@/wab/shared/ApiSchema";
import S3 from "aws-sdk/clients/s3";
import crypto from "crypto";
import { Request, Response } from "express-serve-static-core";
import L from "lodash";
import { getUser, userAnalytics } from "./util";

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

export async function discourseConnect(req: Request, res: Response) {
  const secret = getDiscourseConnectSecret();

  // Parse the request payload from Discourse.
  const { sso: requestPayloadRaw, sig: requestSig } = req.query;
  const requestPayloadEncoded = ensureString(requestPayloadRaw);
  const requestPayload = new Buffer(requestPayloadEncoded, "base64").toString(
    "ascii"
  );
  const nonce = ensure(
    new URLSearchParams(requestPayload).get("nonce"),
    "URL must have nonce"
  );

  function hmac(data: string) {
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
  }

  // Verify the request payload.
  const requestSigVerify = hmac(requestPayloadEncoded);
  if (requestSig !== requestSigVerify) {
    throw new Error("invalid signature in Discourse Connect request!");
  }

  // Generate and sign the response payload.
  const user = getUser(req);
  const responsePayload = omitNils({
    nonce,
    email: user.email,
    external_id: user.id,
    username: L.kebabCase(`${user.firstName} ${user.lastName}`).replace(
      "-",
      "_"
    ),
    name: `${user.firstName} ${user.lastName}`,
    avatar_url: user.avatarUrl,
  });
  const responsePayloadEncoded = new Buffer(
    new URLSearchParams(responsePayload).toString()
  ).toString("base64");
  const responseSig = hmac(responsePayloadEncoded);

  res.json({
    sso: responsePayloadEncoded,
    sig: responseSig,
  });
}
