import { ContentServerComponent } from "@/components/ContentServerComponent";
import { ContentUsePlasmicQueryData } from "@/components/ContentUsePlasmicQueryData";
import { PLASMIC } from "@/plasmic-init";
import { PlasmicClientRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { ExtractPlasmicQueryData } from "@plasmicapp/nextjs-app-router";
import { fetchExtractedQueryData } from "@plasmicapp/nextjs-app-router/react-server";
import * as React from "react";

export const revalidate = 10;

export default async function CodePage({
  params,
  searchParams,
}: {
  params?: { catchall: string[] | undefined };
  searchParams?: Record<string, string | string[]>;
}) {
  const pathname = "/" + (params?.catchall ? params.catchall.join("/") : "");
  const { prefetchedData } = await fetchData();
  const pageMeta = prefetchedData.entryCompMetas[0];
  return withExtractPlasmicQueryData(
    <PlasmicClientRootProvider
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
      prefetchedData={prefetchedData}
    >
      <PlasmicComponent
        component="Layout"
        componentProps={{
          content: (
            <>
              <div>
                <span>
                  Content with data fetched from React Server Component
                </span>
                <ContentServerComponent />
              </div>
              <div>
                <span>Content with data fetched from usePlasmicQueryData</span>
                <ContentUsePlasmicQueryData />
              </div>
            </>
          ),
        }}
      />
    </PlasmicClientRootProvider>,
    {
      pathname,
      searchParams,
    }
  );
}

async function fetchData() {
  const prefetchedData = await PLASMIC.fetchComponentData(
    "Layout",
    "Card",
    "Card: SSR",
    "Card: SSG"
  );

  return { prefetchedData };
}

/**
 * Helper function to extract Plasmic data.
 *
 * Given the <PlasmicClientRootProvider> element and current pathname + search
 * params, returns:
 * - The extracted query data, if `plasmicSsr` search param is set
 * - A copy of the root provider element with the extracted query data, otherwise
 */
async function withExtractPlasmicQueryData(
  plasmicRootProvider: React.ReactElement,
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

  // If `plasmicSsr` search param is set, just wrap the root provider inside
  // <ExtractPlasmicQueryData>
  if (isPlasmicSsr) {
    return (
      <ExtractPlasmicQueryData>{plasmicRootProvider}</ExtractPlasmicQueryData>
    );
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

  // Provide the query data to <PlasmicClientRootProvider>
  return React.cloneElement(plasmicRootProvider, {
    prefetchedQueryData,
  });
}
