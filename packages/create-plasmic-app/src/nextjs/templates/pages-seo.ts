import { ifTs } from "../../utils/file-utils";
import { JsOrTs } from "../../utils/types";

const siteUrl = `  // Set NEXT_PUBLIC_SITE_URL to pin the origin;
  // otherwise it is derived per-request from the request headers.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? \`https://\${process.env.VERCEL_PROJECT_PRODUCTION_URL}\`
      : \`\${req.headers["x-forwarded-proto"] ?? "http"}://\${
          req.headers["x-forwarded-host"] ?? req.headers.host
        }\`);`;

function makeHeader(jsOrTs: JsOrTs) {
  return ifTs(jsOrTs, `import type { GetServerSideProps } from "next";\n`);
}

function makeSignature(jsOrTs: JsOrTs) {
  return `export const getServerSideProps${ifTs(
    jsOrTs,
    ": GetServerSideProps"
  )} = async ({ req, res }) => {`;
}

function makeSitemapXml(jsOrTs: JsOrTs) {
  return `function escapeXml(str${ifTs(jsOrTs, ": string")}) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeSitemapXml(urls${ifTs(jsOrTs, ": string[]")}) {
  const entries = urls.map(
    (url) => \`  <url><loc>\${escapeXml(url)}</loc></url>\`
  );
  return \`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${entries.join("\\n")}
</urlset>
\`;
}`;
}

export function makeSitemap_pages_loader(jsOrTs: JsOrTs): string {
  return `import { PLASMIC } from "@/plasmic-init";
${makeHeader(jsOrTs)}
${makeSitemapXml(jsOrTs)}

${makeSignature(jsOrTs)}
${siteUrl}

  // fetchPages() drops pages whose path takes a param, e.g. "/blog/[slug]".
  const pages = await PLASMIC.fetchPages();
  const urls = pages.map((page) => new URL(page.path, siteUrl).toString());

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.write(makeSitemapXml(urls));
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
`;
}

export function makeSitemap_pages_codegen(jsOrTs: JsOrTs): string {
  const projects =
    jsOrTs === "ts"
      ? `(plasmicJson.projects as {
    components: { componentType: string; path?: string }[];
  }[])`
      : "plasmicJson.projects";

  return `${makeHeader(jsOrTs)}import plasmicJson from "../plasmic.json";

${makeSitemapXml(jsOrTs)}

${makeSignature(jsOrTs)}
${siteUrl}

  const urls = ${projects}
    .flatMap((project) => project.components)
    .flatMap((component) =>
      component.componentType === "page" &&
      component.path &&
      !component.path.includes("[")
        ? // next.config sets trailingSlash.
          [new URL(component.path.replace(/\\/?$/, "/"), siteUrl).toString()]
        : []
    );

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.write(makeSitemapXml(urls));
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
`;
}

export function makeRobots_pages(jsOrTs: JsOrTs): string {
  return `${ifTs(
    jsOrTs,
    `import type { GetServerSideProps } from "next";\n\n`
  )}${makeSignature(jsOrTs)}
${siteUrl}

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(
    \`User-agent: *\\nAllow: /\\n\\nSitemap: \${new URL(
      "/sitemap.xml",
      siteUrl
    ).toString()}\\n\`
  );
  res.end();
  return { props: {} };
};

export default function Robots() {
  return null;
}
`;
}
