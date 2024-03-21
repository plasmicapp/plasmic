This package provides helpers for doing extractPlasmicQueryData() with Next.js App Router.

We normally use react-ssr-prepass to fake-render a React tree to gather data requirements. We can't do so in RSC mode, because all the client components are imported as placeholders, so we cannot fake-render them.

The idea here is to use the dev server's SSR instead! At SSR time (instead of RSC time), we do have access to imported client components. So... we could do pre-rendering there, gather the data needs, and respond with them. At RSC time, we hit the SSR endpoint, and parse out the data needs.

So...

1. Create a `app/plasmic-ssr/[[...catchall]]/page.tsx` route, whose purpose is to perform SSR. It looks something like...

```
import { ExtractPlasmicQueryData } from "@plasmicapp/nextjs-app-router";

export default async function CatchallPrepass(props: {
  params?: Params;
}) {
  const { params } = props;

  const plasmicPath = params.catchall ? `/${params.catchall.join("/")}` : "/";
  const prefetchedData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }

  const pageMeta = prefetchedData.entryCompMetas[0];

  return (
    <ExtractPlasmicQueryData>
      <PlasmicClientRootProvider
        prefetchedData={prefetchedData}
        pageParams={pageMeta.params}
      >
        <PlasmicComponent
          component={pageMeta.displayName}
        />
      </PlasmicClientRootProvider>
    </ExtractPlasmicQueryData>
  )
}
```

`<ExtractPlasmicQueryData />` is a new client component from this package, which basically performs `extractPlasmicQueryData()` on its children, and then renders a `<script data-plasmic-prefetch-id/>` tag with the json of the extracted data.

2. From the real `app/[...catchall]/page.tsx` file, make use of this endpoint to read the extracted data:

```
import { fetchExtractedQueryData } from "@plasmicapp/nextjs-app-router";

export default async function Catchall(props: {
  params?: Params;
}) {
  const { params } = props;

  const plasmicPath = params.catchall ? `/${params.catchall.join("/")}` : "/";
  const prefetchedData = await PLASMIC.maybeFetchComponentData(plasmicPath);

  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }

  const prepassHost = process.env.PLASMIC_PREPASS_HOST ?? process.env.VERCEL_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

  const queryData = await fetchExtractedQueryData(`${prepassHost}/plasmic-ssr/${(params?.catchall ?? []).join("/")}`);

  const pageMeta = prefetchedData.entryCompMetas[0];

  return (
    <PlasmicClientRootProvider
      prefetchedData={prefetchedData}
      prefetchedQueryData={queryData}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent
        component={pageMeta.displayName}
      />
    </PlasmicClientRootProvider>
  )
}
```

Here, `fetchExtractedQueryData()` basically just hits the `/plasmic-ssr/` endpoint, and extracts the data from the json embedded in the `<script/>`.

The `prepassHost` to use is read from `PLASMIC_PREPASS_HOST` or `VERCEL_URL`. `VERCEL_URL` is available when your site is deployed on Vercel; it is the generated deployment url.

`@plasmicapp/nextjs-app-router` also comes with a `with-plasmic-prepass` command that you can use like this in your package.json:

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

So...

- At dev time, uses itself for extracting query data (hits `localhost:${PORT}`)
- At build time, we start a parallel dev server.
- In production, with revalidation, it will also use itself for extracting query data (using `VERCEL_URL` as the prepass host).
