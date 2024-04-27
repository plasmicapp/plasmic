import { withNext } from "@/wab/server/routes/util";
import {
  GetSubscriptionResponse,
  RevalidatePlasmicHostingResponse,
} from "@/wab/shared/ApiSchema";
import { Application, Request, Response } from "express";

export const ROUTES_WITH_TIMING = [];

export function addInternalRoutes(app: Application) {
  addHostingRoutes(app);
  addPaymentRoutes(app);
}

export function addInternalIntegrationsRoutes(app: Application) {}

function addHostingRoutes(app: Application) {
  app.post("/api/v1/revalidate-hosting", withNext(revalidatePlasmicHosting));
}

function addPaymentRoutes(app: Application) {
  app.get(
    "/api/v1/billing/subscription/:teamId",
    withNext(getBillingSubscription)
  );
}

/**
 * Hook for custom logic for creating a team. If handled, returns true;
 * else returns false and default handling will take place.
 */
export async function customCreateTeam(req: Request, res: Response) {
  return false;
}

/**
 * Returns true if req corresponds to a custom public API request, and thus
 * does not need CSRF checking
 */
export function isCustomPublicApiRequest(req: Request) {
  return false;
}

function revalidatePlasmicHosting(req: Request, res: Response) {
  const response: RevalidatePlasmicHostingResponse = {
    successes: [],
    failures: [],
  };
  res.json(response);
}

function getBillingSubscription(req: Request, res: Response) {
  const response: GetSubscriptionResponse = {
    type: "notFound",
  };
  res.json(response);
}
