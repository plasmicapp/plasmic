import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import plasmicJson from "../plasmic.json";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();

  return (plasmicJson.projects as {
    components: { componentType: string; path?: string }[];
  }[])
    .flatMap((project) => project.components)
    .flatMap((component) =>
      component.componentType === "page" &&
      component.path &&
      !component.path.includes("[")
        ? [
            {
              // next.config sets trailingSlash.
              url: new URL(
                component.path.replace(/\/?$/, "/"),
                siteUrl
              ).toString(),
            },
          ]
        : []
    );
}
