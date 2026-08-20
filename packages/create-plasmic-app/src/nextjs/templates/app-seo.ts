import { ifTs } from "../../utils/file-utils";
import { JsOrTs } from "../../utils/types";

const getSiteUrl = `// Set NEXT_PUBLIC_SITE_URL to pin the origin and keep this route static;
// otherwise it is derived per-request, which opts the route out of prerendering.
async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return \`https://\${process.env.VERCEL_PROJECT_PRODUCTION_URL}\`;
  }
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return \`\${proto}://\${h.get("x-forwarded-host") ?? h.get("host")}\`;
}`;

function makeHeader(jsOrTs: JsOrTs) {
  return `${ifTs(
    jsOrTs,
    `import type { MetadataRoute } from "next";\n`
  )}import { headers } from "next/headers";\n`;
}

function makeSignature(jsOrTs: JsOrTs) {
  return `export default async function sitemap()${ifTs(
    jsOrTs,
    ": Promise<MetadataRoute.Sitemap>"
  )} {`;
}

export function makeSitemap_app_loader(jsOrTs: JsOrTs): string {
  return `import { PLASMIC } from "@/plasmic-init";
${makeHeader(jsOrTs)}
export const revalidate = 60;

${getSiteUrl}

${makeSignature(jsOrTs)}
  const siteUrl = await getSiteUrl();

  // fetchPages() drops pages whose path takes a param, e.g. "/blog/[slug]".
  const pages = await PLASMIC.fetchPages();

  return pages.map((page) => ({
    url: new URL(page.path, siteUrl).toString(),
  }));
}
`;
}

export function makeSitemap_app_codegen(jsOrTs: JsOrTs): string {
  const projects =
    jsOrTs === "ts"
      ? `(plasmicJson.projects as {
    components: { componentType: string; path?: string }[];
  }[])`
      : "plasmicJson.projects";

  return `${makeHeader(jsOrTs)}import plasmicJson from "../plasmic.json";

${getSiteUrl}

${makeSignature(jsOrTs)}
  const siteUrl = await getSiteUrl();

  return ${projects}
    .flatMap((project) => project.components)
    .flatMap((component) =>
      component.componentType === "page" &&
      component.path &&
      !component.path.includes("[")
        ? [
            {
              // next.config sets trailingSlash.
              url: new URL(
                component.path.replace(/\\/?$/, "/"),
                siteUrl
              ).toString(),
            },
          ]
        : []
    );
}
`;
}

export function makeRobots_app(jsOrTs: JsOrTs): string {
  return `${makeHeader(jsOrTs)}
${getSiteUrl}

export default async function robots()${ifTs(
    jsOrTs,
    ": Promise<MetadataRoute.Robots>"
  )} {
  const siteUrl = await getSiteUrl();

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
`;
}
