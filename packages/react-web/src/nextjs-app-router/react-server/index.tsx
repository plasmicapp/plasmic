import { ExtractPlasmicQueryData } from "@plasmicapp/nextjs-app-router";
import {
  fetchExtractedHeadMetadata,
  fetchExtractedQueryData,
  withPlasmicMetadata,
} from "@plasmicapp/nextjs-app-router/react-server";
import { PlasmicQueryDataProvider } from "@plasmicapp/query";
import React from "react";

export {
  fetchExtractedQueryData as __EXPERMIENTAL__fetchExtractedQueryData,
  fetchExtractedHeadMetadata as __EXPERMIENTAL__fetchExtractedHeadMetadata,
  withPlasmicMetadata as __EXPERMIENTAL__withPlasmicMetadata,
};

/**
 * Helper function to extract Plasmic data.
 *
 * Given React element for your page and current pathname + search
 * params, returns:
 * - The extracted query data, if `plasmicSsr` search param is set
 * - A copy of the page element wraped within PlasmicQueryDataProvider to provide the extracted query data, otherwise
 */
export async function __EXPERMIENTAL__withExtractPlasmicQueryData(
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
