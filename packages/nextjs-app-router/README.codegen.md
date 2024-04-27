This package provides helpers for doing extractPlasmicQueryData() with Next.js App Router.

We normally use react-ssr-prepass to fake-render a React tree to gather data requirements. We can't do so in RSC mode, because all the client components are imported as placeholders, so we cannot fake-render them.

The idea here is to use the dev server's SSR instead! At SSR time (instead of RSC time), we do have access to imported client components. So... we could do pre-rendering there, gather the data needs, and respond with them. At RSC time, we hit the SSR endpoint, and parse out the data needs.

So...

1. First update you `plasmic.json` to use the `app` directory for pages and run `plasmic sync` again to automatically move the pages there:

```
  "nextjsConfig": {
    "pagesDir": "../app"
  },
```

2. Update `app/MyPage/page.tsx` to conditionally wrap the page contents inside `<ExtractPlasmicQueryData>` to extract the query data. It would look something like:

```
// app/page.tsx

import * as React from "react";
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import { PlasmicHomepage } from "../components/plasmic/my-plasmic-project/PlasmicHomepage";
import { PlasmicQueryDataProvider } from "@plasmicapp/react-web/lib/query";
import { ExtractPlasmicQueryData } from "@plasmicapp/nextjs-app-router";
import { fetchExtractedQueryData } from "@plasmicapp/nextjs-app-router/react-server";

// (Optional: In case you project uses Global Contexts)
import GlobalContextsProvider from "../components/plasmic/my-plasmic-project/PlasmicGlobalContextsProvider";

async function Homepage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  return withExtractPlasmicQueryData(
    <GlobalContextsProvider>
      <PageParamsProvider__ route={"/"} query={searchParams}>
        <PlasmicHomepage />
      </PageParamsProvider__>
    </GlobalContextsProvider>,
    {
      pathname: "/",
      searchParams,
    }
  );
}

export default Homepage;

/**
 * Helper function to extract Plasmic data.
 *
 * Given React element for your page and current pathname + search
 * params, returns:
 * - The extracted query data, if `plasmicSsr` search param is set
 * - A copy of the page element wraped within PlasmicQueryDataProvider to provide the extracted query data, otherwise
 */
async function withExtractPlasmicQueryData(
  pageRootElt: React.ReactElement,
  {
    pathname,
    searchParams,
  }: {
    pathname: string;
    searchParams: Record<string, string | string[]> | undefined;
  }
) {
  const isPlasmicSsr =
    !!searchParams?.["plasmicSsr"] && searchParams?.["plasmicSsr"] !== "false";

  // If `plasmicSsr` search param is set, just wrap the page inside
  // <ExtractPlasmicQueryData>
  if (isPlasmicSsr) {
    return <ExtractPlasmicQueryData>{pageRootElt}</ExtractPlasmicQueryData>;
  }

  // Otherwise, fetch the same endpoint, but setting `plasmicSsr` to extract the
  // query data.
  const prepassHost =
    process.env.PLASMIC_PREPASS_HOST ??
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
    `http://localhost:${process.env.PORT ?? 3000}`;

  // Build a copy of the search params
  const newSearchParams = new URLSearchParams(
    Object.entries(searchParams ?? {}).flatMap(([key, values]) =>
      Array.isArray(values) ? values.map((v) => [key, v]) : [[key, values]]
    )
  );

  // Set `plasmicSsr` search param to indicate you are using this endpoint
  // to extract query data.
  newSearchParams.set("plasmicSsr", "true");

  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    // If protection bypass is enabled, use it to ensure fetching from
    // the SSR endpoint will not return the authentication page HTML
    newSearchParams.set(
      "x-vercel-protection-bypass",
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    );
  }

  // Fetch the data from the endpoint using the new search params
  const prefetchedQueryData = await fetchExtractedQueryData(
    `${prepassHost}${pathname}?${newSearchParams.toString()}`
  );

  // Provide the query data to your page
  return (
    <PlasmicQueryDataProvider prefetchedCache={prefetchedQueryData}>
      {pageRootElt}
    </PlasmicQueryDataProvider>
  );
}

```

`<ExtractPlasmicQueryData />` is a new client component from this package, which basically performs `extractPlasmicQueryData()` on its children, and then renders a `<script data-plasmic-prefetch-id/>` tag with the json of the extracted data. The helper function `withExtractPlasmicQueryData` will likely be moved into the package in the future.

Here, `fetchExtractedQueryData()` basically just hits the same endpoint with `?plasmicSsr=true`, and extracts the data from the json embedded in the `<script/>`.

The `prepassHost` to use is read from `PLASMIC_PREPASS_HOST` or `VERCEL_URL`. `VERCEL_URL` is available when your site is deployed on Vercel; it is the generated deployment url.

3. If you have static generation at build time, `@plasmicapp/nextjs-app-router` also comes with a `with-plasmic-prepass` command that you can use like this in your package.json:

```
"script": {
  "build": "with-plasmic-prepass -- next build"
}
```

This script will start up the next dev server at some random port (by running npm run dev), run the passed command, and then kill the dev server. It will run the command with the proper `PLASMIC_PREPASS_HOST` env variable, so the user never needs to think about it. You can choose to use a different package.json script command to start the dev server via `with-plasmic-prepass -c prepass -- next build`.

Unfortunately another drawback is that the dev server and the build process will step on each other's toes, so you need to direct them to use different output folders. You do it in `next.config.js`:

```
module.exports = {
  distDir: process.env.PLASMIC_PREPASS_SERVER ? ".next-prepass" : ".next"
}
```

The `PLASMIC_PREPASS_SERVER` environment variable will be set by with-plasmic-prepass.

4. If you are deploying to Vercel, make sure to either disable [Vercel Authentication](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) or provide the [Protection Bypass](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) (Note: this is a paid feature). This is to ensure the SSR endpoint will not return Vercel's page authentication HTML.

So...

- At dev time, uses itself for extracting query data (hits `localhost:${PORT}`)
- At build time, we start a parallel dev server via `with-plasmic-prepass`.
- In production, with revalidation, it will also use itself for extracting query data (using `VERCEL_URL` as the prepass host).
