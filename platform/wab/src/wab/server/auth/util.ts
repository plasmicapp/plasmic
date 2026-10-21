import { User } from "@/wab/server/entities/Entities";
import { makeUserTraits } from "@/wab/server/routes/util";
import { disconnectUserSockets } from "@/wab/server/socket-util";
import { spawn } from "@/wab/shared/common";
import { Request, Response } from "express-serve-static-core";
import { promisify } from "util";

export function doLogin(
  request: Request,
  user: User,
  done: (err: any) => void,
) {
  spawn(
    disconnectUserSockets(request).then(() => {
      request.logIn(user, done);
      request.analytics.identify(user.id, makeUserTraits(user));
    }),
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
