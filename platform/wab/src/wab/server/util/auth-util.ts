import OktaJwtVerifier from "@okta/jwt-verifier";
import { Request } from "express-serve-static-core";
import { spawn } from "../../common";
import { ForbiddenError } from "../../shared/ApiErrors/errors";
import { TeamWhiteLabelInfo } from "../../shared/ApiSchema";
import { User } from "../entities/Entities";
import { makeUserTraits } from "../routes/util";
import { disconnectUserSockets } from "../socket-util";

export function doLogin(
  request: Request,
  user: User,
  done: (err: any) => void
) {
  spawn(
    disconnectUserSockets(request).then(() => {
      request.app.analytics.identify({
        userId: user.id,
        traits: makeUserTraits(user),
      });
      request.logIn(user, done);
    })
  );
}

export async function doLogout(request: Request) {
  await disconnectUserSockets(request);
  return new Promise((resolve) => {
    // Requests forwarded to socket server do not set up passport
    if (typeof request.logout === "function") {
      request.logout(resolve);
    } else {
      resolve(true);
    }
  });
}

export async function verifyClientCredentials(
  whiteLabelName: string,
  token: string,
  info: Exclude<TeamWhiteLabelInfo["apiClientCredentials"], undefined>
) {
  const verifier = new OktaJwtVerifier({
    issuer: info.issuer,
    clientId: info.clientId,
    assertClaims: {
      cid: info.clientId,
    },
  });
  try {
    await verifier.verifyAccessToken(token, info.aud);
  } catch (err) {
    console.error(
      `Failed to verify client credentials for ${whiteLabelName}: ${token}: ${err}`
    );
    throw new ForbiddenError(`Invalid client token: ${err.userMessage}`);
  }
}
