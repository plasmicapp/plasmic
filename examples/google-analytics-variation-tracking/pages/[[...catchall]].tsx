import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";

import { PLASMIC } from "@/plasmic-init";
import {
  generateAllPaths,
  getActiveVariation,
  rewriteWithoutTraits,
} from "@plasmicapp/loader-nextjs/edge";
import Error from "next/error";
import { useRouter } from "next/router";
import Script from "next/script";

// This is the google analytics id that you get on your dashboard
const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
  variation?: Record<string, string>;
  externalIds?: Record<string, string>;
}) {
  const { plasmicData, queryCache, variation, externalIds } = props;
  const router = useRouter();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  // Use the external IDs to perform tracking
  return (
    <>
      {/* Adds gtag, this can be installed globally, GA_MEASUREMENT_ID is the google analytics id that you get on your dashboard */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      {/* Now we only have to append the externalIds as properties to any event that we send to google analytics */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_MEASUREMENT_ID}', { 'send_page_view': false });
          gtag('event', 'pageview', ${JSON.stringify(externalIds)});

      `}
      </Script>
      <PlasmicRootProvider
        loader={PLASMIC}
        prefetchedData={plasmicData}
        prefetchedQueryData={queryCache}
        pageParams={pageMeta.params}
        pageQuery={router.query}
        variation={variation}
      >
        <PlasmicComponent component={pageMeta.displayName} />
      </PlasmicRootProvider>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const rawPlasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";

  // Parse the path and extract the traits
  const { path: plasmicPath, traits } = rewriteWithoutTraits(rawPlasmicPath);

  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // non-Plasmic catch-all
    return { props: {} };
  }

  // Get the active variation for this page
  const variation = getActiveVariation({
    splits: PLASMIC.getActiveSplits(),
    traits,
    path: plasmicPath,
  });

  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
      variation={variation}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  // Retrieve the external IDs for this variation
  const externalIds = PLASMIC.getExternalVariation(variation, {
    // Filter the external IDs to only include the ones for the projects used in this page
    projectIds: plasmicData.entryCompMetas.map((m) => m.projectId),
  });
  // Use revalidate if you want incremental static regeneration
  return {
    props: { plasmicData, queryCache, variation, externalIds },
    revalidate: 60,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const pageModules = await PLASMIC.fetchPages();
  function* gen() {
    for (const page of pageModules) {
      // Generate all possible paths for this page including all variations
      const allPaths = generateAllPaths(page.path);
      for (const path of allPaths) {
        yield {
          params: {
            catchall: path.substring(1).split("/"),
          },
        };
      }
    }
  }
  return {
    paths: Array.from(gen()),
    fallback: "blocking",
  };
};
