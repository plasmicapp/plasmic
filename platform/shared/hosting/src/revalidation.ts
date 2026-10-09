import { createHmac } from "node:crypto";

// Node-only: keep crypto out of the browser/edge entry point.
// Callers use the request's canonical hostname, never the stored domain casing.
export function getHostingRevalidationAuth(secret: string, host: string) {
  const token = createHmac("sha256", secret)
    .update(`hosting-revalidate:${host}`)
    .digest("hex");
  return `Bearer ${token}`;
}
