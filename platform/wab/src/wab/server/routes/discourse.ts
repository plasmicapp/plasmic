import { getUser, userDbMgr } from "@/wab/server/routes/util";
import { getDiscourseConnectSecret } from "@/wab/server/secrets";
import { ensure, ensureString, notNil, omitNils } from "@/wab/shared/common";
import { MIN_ACCESS_LEVEL_FOR_SUPPORT } from "@/wab/shared/discourse/config";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import crypto from "crypto";
import { Request, Response } from "express-serve-static-core";
import L from "lodash";

/**
 * Authenticates a Plasmic user for the Discourse forum.
 *
 * Our forum is configured to delegate authentication to our Plasmic server,
 * using the Discourse Connect (SSO) feature.
 * https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045
 *
 * This endpoint will be called by Discourse when a user tries to sign in.
 *
 * In addition to creating a user in Discourse, it will also add the user to
 * the relevant support groups corresponding to their team/org memberships.
 */
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
  const dbMgr = userDbMgr(req);

  // Figure out which groups they should be added to for private support.
  // `getAffiliatedTeamPermissions` may return teams with access < min level.
  // Filter teams with access >= min level.
  // `getDiscourseInfosByTeamIds` checks teams for access >= min level.
  const perms = await dbMgr.getAffiliatedTeamPermissions();
  const teamIds = perms
    .filter(
      (p) =>
        accessLevelRank(p.accessLevel) >=
        accessLevelRank(MIN_ACCESS_LEVEL_FOR_SUPPORT)
    )
    .map((p) => p.teamId)
    .filter(notNil);
  const discourseInfo = await dbMgr.getDiscourseInfosByTeamIds(teamIds);
  const groupsCommaDelimited = discourseInfo.map((org) => org.slug).join(",");

  console.log(
    `Signing in user ${user.id} with email ${user.email} with groups ${groupsCommaDelimited}`
  );
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
    add_groups: groupsCommaDelimited,
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
