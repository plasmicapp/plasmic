import { NextFunction, Request, Response } from "express";

/**
 * Checks if request is using a Team API token, acting on behalf of
 * a specific user.  Populates req.apiTeam and req.user if so.
 */
export async function customTeamApiUserAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  next();
}

/**
 * Checks if request is using a Team API token. Populates
 * req.apiTeam if so.
 */
export async function customTeamApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  next();
}
