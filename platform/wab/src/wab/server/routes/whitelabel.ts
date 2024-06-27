import { ensure, ensureType } from "@/wab/shared/common";
import { User } from "@/wab/server/entities/Entities";
import { superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import { doLogin } from "@/wab/server/util/auth-util";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";
import { ApiWhiteLabelUser, TeamJwtOpenPayload } from "@/wab/shared/ApiSchema";
import { NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import * as jwt from "jsonwebtoken";

function whiteLabelMgr(req: Request) {
  if (!req.apiTeam) {
    throw new ForbiddenError(`Must use a Team API token`);
  }

  if (
    !req.apiTeam.whiteLabelName ||
    req.apiTeam.whiteLabelName !== req.params.whiteLabelName
  ) {
    throw new ForbiddenError(`Cannot use white label API`);
  }

  return userDbMgr(req);
}

/**
 * Unlike the other endpoints here, this is directly opened from the browser,
 * so it doesn't check for things like team token or req.apiTeam. Instead,
 * it reads the jwt token in the url query
 */
export async function openJwt(req: Request, res: Response, next: NextFunction) {
  const token = req.query.token;
  if (!token || typeof token !== "string") {
    throw new BadRequestError(`Missing JWT token to open Plasmic page`);
  }

  const url = req.query.url;
  if (!url || typeof url !== "string") {
    throw new BadRequestError(`Missing url to open`);
  }
  if (!url.startsWith("/")) {
    throw new BadRequestError(
      `Can only redirect to relative urls, starts with "/"`
    );
  }

  const whiteLabelName = req.params.whiteLabelName;

  const superMgr = superDbMgr(req);
  const team = await superMgr.getTeamByWhiteLabelName(whiteLabelName);

  const redirectConfig = team.whiteLabelInfo?.openRedirect;
  if (!redirectConfig) {
    throw new UnauthorizedError(
      `Not authorized to open Plasmic pages as users`
    );
  }

  let jwtPayload: any;
  try {
    jwtPayload = jwt.verify(token, redirectConfig.publicKey, {
      algorithms: [redirectConfig.algo],
    });
  } catch (err) {
    console.log(`Error openJwt ${err}`);
    throw new UnauthorizedError(`Invalid token`);
  }

  const payload = asValidJwtPayload(jwtPayload);
  console.log(`JWT token payload`, payload);
  if (payload.team !== team.whiteLabelName) {
    throw new UnauthorizedError(`Invalid token`);
  }

  const user = await superMgr.getUserByWhiteLabelId(
    team.id,
    payload.externalUserId
  );
  await new Promise<void>((resolve) => {
    doLogin(req, user, (err2) => {
      if (err2) {
        return next(err2);
      }
      resolve();
    });
  });

  res.redirect(url);
}

function asValidJwtPayload(payload: any) {
  if (!payload || payload == null || typeof payload !== "object") {
    console.log(`Error validating jwt: not an object`);
    throw new UnauthorizedError(`Invalid token`);
  }
  if (payload.team && payload.externalUserId) {
    return payload as TeamJwtOpenPayload;
  }
  console.log(`Error validating jwt: not all necessary fields: ${payload}`);
  throw new UnauthorizedError(`Invalid token`);
}

export async function createWhiteLabelUser(req: Request, res: Response) {
  const mgr = whiteLabelMgr(req);
  const team = ensure(req.apiTeam, "Always defined for whiteLabelMgr");
  const info = req.body as Omit<ApiWhiteLabelUser, "id">;
  if (!info.email || !info.externalId || !info.firstName || !info.lastName) {
    throw new BadRequestError(`Missing information on user`);
  }

  const existingUser = await mgr.tryGetUserByWhiteLabelId(
    team.id,
    info.externalId
  );
  if (existingUser) {
    throw new BadRequestError(
      `User with external ID ${info.externalId} already exists`
    );
  }

  const user = await mgr.createWhiteLabelUser({
    firstName: info.firstName,
    lastName: info.lastName,
    email: info.email,
    whiteLabelId: info.externalId,
    teamId: team.id,
  });

  res.json(toWhiteLabelUser(user));
}

export async function getWhiteLabelUser(req: Request, res: Response) {
  const mgr = whiteLabelMgr(req);
  const team = ensure(req.apiTeam, "Always defined for whiteLabelMgr");

  const user = await mgr.getUserByWhiteLabelId(
    team.id,
    req.params.externalUserId
  );
  res.json(toWhiteLabelUser(user));
}

export async function deleteWhiteLabelUser(req: Request, res: Response) {
  const mgr = whiteLabelMgr(req);
  const team = ensure(req.apiTeam, "Always defined for whiteLabelMgr");
  const user = await mgr.getUserByWhiteLabelId(
    team.id,
    req.params.externalUserId
  );
  console.log("DELETING USER", user);
  await mgr.deleteUser(user, false);
  res.json({ deletedId: req.params.externalUserId });
}

function toWhiteLabelUser(user: User) {
  return ensureType<ApiWhiteLabelUser>({
    email: user.whiteLabelInfo?.email ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    id: user.id,
    externalId: user.whiteLabelId!,
  });
}
