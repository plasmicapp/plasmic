export const getServerSideProps = async ({ req, res }) => {
  // Set NEXT_PUBLIC_SITE_URL to pin the origin;
  // otherwise it is derived per-request from the request headers.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : `${req.headers["x-forwarded-proto"] ?? "http"}://${
          req.headers["x-forwarded-host"] ?? req.headers.host
        }`);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL(
      "/sitemap.xml",
      siteUrl
    ).toString()}\n`
  );
  res.end();
  return { props: {} };
};

export default function Robots() {
  return null;
}
