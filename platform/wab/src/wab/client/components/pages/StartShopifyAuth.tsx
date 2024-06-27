import { spawn } from "@/wab/shared/common";
import { useEffect } from "react";

/**
 * This exists only because our API server uses same-site: strict.
 *
 * The Shopify flow starts from Shopify and not Plasmic. You install or open
 * Plasmic from your Shopify store admin UI.
 *
 * Visiting an /api route directly from any external site would clear your
 * cookies and logging you out, due to same-site: strict.
 *
 * So instead we visit a normal page, which can then safely redirect to an /api
 * route (who in turn redirects us further).
 *
 * This should not be behind a login, since when the user clicks install, they
 * should immediately be presented the oauth approval page - only after that
 * should they be faced with an auth wall (handled by FinishShopifyAuth).
 */
export function StartShopifyAuth() {
  useEffect(() => {
    spawn(
      (async () => {
        const url = new URL(`${origin}/api/v1/auth/shopify`);
        url.search = location.search;
        location.replace(url.toString());
      })()
    );
  }, []);
  return null;
}

/**
 * This exists only because our API server uses same-site: strict.
 *
 * Unlike StartShopifyAuth, this one is behind an auth wall. We rely on nextUrl
 * handling to take the user to this page.
 */
export function FinishShopifyAuth() {
  useEffect(() => {
    spawn(
      (async () => {
        const url = new URL(`${origin}/api/v1/oauth2/shopify/callback`);
        url.search = location.search;
        location.replace(url.toString());
      })()
    );
  }, []);
  return null;
}
