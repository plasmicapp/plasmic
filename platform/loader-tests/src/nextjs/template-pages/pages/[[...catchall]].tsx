import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetStaticPaths, GetStaticProps } from "next";
import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../init";

const DATA_HOST = undefined; // __DATA_HOST__

// @ts-expect-error globalThis
globalThis["__PLASMIC_DATA_HOST"] = DATA_HOST ?? "http://localhost:3003";

/**
 * Use fetchPages() to fetch list of pages that have been created in Plasmic
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await PLASMIC.fetchPages();
  return {
    paths: pages.map((page) => ({
      params: { catchall: page.path.substring(1).split("/") },
    })),
    fallback: "blocking",
  };
};

/**
 * For each page, pre-fetch the data we need to render it
 */
export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};

  // Convert the catchall param into a path string
  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // This is some non-Plasmic catch-all page
    return {
      props: {},
    };
  }

  // This is a path that Plasmic knows about.
  const pageMeta = plasmicData.entryCompMetas[0];

  // Cache the necessary data fetched for the page.
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );

  // Pass the data in as props.
  return {
    props: { plasmicData, queryCache },

    // Using incremental static regeneration, will invalidate this page
    // after 300s (no deploy webhooks needed)
    revalidate: 300,
  };
};

/**
 * Actually render the page!
 */
export default function CatchallPage(props: {
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
    // Pass in the data fetched in getStaticProps as prefetchedData
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageParams={pageMeta.params}
      pageQuery={router.query}
    >
      {
        // pageMeta.displayName contains the name of the component you fetched.
      }
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}
