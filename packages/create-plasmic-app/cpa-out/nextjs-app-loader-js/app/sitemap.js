import { PLASMIC } from "@/plasmic-init";
import { headers } from "next/headers";

export const revalidate = 60;

// Set NEXT_PUBLIC_SITE_URL to pin the origin and keep this route static;
// otherwise it is derived per-request, which opts the route out of prerendering.
async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export default async function sitemap() {
  const siteUrl = await getSiteUrl();

  // fetchPages() drops pages whose path takes a param, e.g. "/blog/[slug]".
  const pages = await PLASMIC.fetchPages();

  return pages.map((page) => ({
    url: new URL(page.path, siteUrl).toString(),
  }));
}
