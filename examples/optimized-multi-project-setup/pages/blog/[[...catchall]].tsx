import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
  extractPlasmicQueryData,
  initPlasmicLoader,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";

import CookiesPolicy from "@/components/CookiesPolicy";
import { LIBRARY_PROJECT_CONFIG, registerCodeComponents } from "@/plasmic-init";
import Error from "next/error";
import { useRouter } from "next/router";

// We will initialize the Plasmic loader instance contextualized to the project
// which is responsible by the pages handled by this catch-all route.
const PLASMIC = initPlasmicLoader({
  projects: [
    {
      // Blog project
      id: "waHQepGxJhtu3k3FzFxJoR",
      token:
        "SRpJIViPA2NDzuAg6Wb5Meo022e35zG9FzTi4v48OfUPJIZAFBepihlF6v6mxTs6ez41iZNJE8xyWzzA",
    },
    LIBRARY_PROJECT_CONFIG,
  ],
  preview: false,
});

// It's possible to register only code components that are used in this page,
// which is going to reduce the page size since the unused code components can
// be tree-shaken by the bundler.
registerCodeComponents(PLASMIC);

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={router.query}
    >
      <PlasmicComponent component={pageMeta.displayName} />
      <CookiesPolicy />
    </PlasmicRootProvider>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  // We include the "CookiesPolicy" component as an argument since we render it in the page too
  const plasmicData = await PLASMIC.maybeFetchComponentData(
    plasmicPath,
    "CookiesPolicy"
  );
  if (!plasmicData) {
    // non-Plasmic catch-all
    return { props: {} };
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  // Use revalidate if you want incremental static regeneration
  return { props: { plasmicData, queryCache }, revalidate: 60 };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const pageModules = await PLASMIC.fetchPages();
  return {
    paths: pageModules.map((mod) => ({
      params: {
        catchall: mod.path.substring(1).split("/"),
      },
    })),
    fallback: "blocking",
  };
};
