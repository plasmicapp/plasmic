import { User } from "@/wab/server/entities/Entities";
import { logger } from "@/wab/server/observability";
import { makeUserTraits } from "@/wab/server/routes/util";
import { disconnectUserSockets } from "@/wab/server/socket-util";
import { ForbiddenError } from "@/wab/shared/ApiErrors/errors";
import { TeamWhiteLabelInfo } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import OktaJwtVerifier from "@okta/jwt-verifier";
import { Request, Response } from "express-serve-static-core";
import { promisify } from "util";

export function doLogin(
  request: Request,
  user: User,
  done: (err: any) => void
) {
  spawn(
    disconnectUserSockets(request).then(() => {
      request.logIn(user, done);
      request.analytics.identify(user.id, makeUserTraits(user));
    })
  );
}

export async function doLogout(request: Request, response: Response) {
  await disconnectUserSockets(request);
  if (!response.headersSent) {
    response.clearCookie("plasmic-observer");
  }
  // Must reset the session to prevent session fixation attacks, reset the CSRF
  // token, etc.
  if (request.session) {
    await promisify(request.session.destroy.bind(request.session))();
  }
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
    logger().error(
      `Failed to verify client credentials for ${whiteLabelName}: ${token}: ${err}`
    );
    throw new ForbiddenError(`Invalid client token: ${err.userMessage}`);
  }
}
