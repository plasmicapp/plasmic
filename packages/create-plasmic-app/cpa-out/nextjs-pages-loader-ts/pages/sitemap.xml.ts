import { PLASMIC } from "@/plasmic-init";
import type { GetServerSideProps } from "next";

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeSitemapXml(urls: string[]) {
  const entries = urls.map(
    (url) => `  <url><loc>${escapeXml(url)}</loc></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  // Set NEXT_PUBLIC_SITE_URL to pin the origin;
  // otherwise it is derived per-request from the request headers.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : `${req.headers["x-forwarded-proto"] ?? "http"}://${
          req.headers["x-forwarded-host"] ?? req.headers.host
        }`);

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
