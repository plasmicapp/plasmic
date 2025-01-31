import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetStaticPaths, GetStaticProps } from "next";
import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../plasmic-init";

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
  if (plasmicData) {
    // This is a path that Plasmic knows about; pass the data
    // in as props
    return {
      props: { plasmicData },

      // Using incremental static regeneration, will re-generate this page
      // after 300s
      revalidate: 300,
    };
  } else {
    // This is some non-Plasmic catch-all page
    return {
      props: {},
    };
  }
};

/**
 * Actually render the page!
 */
export default function CatchallPage(props: {
  plasmicData?: ComponentRenderData;
}) {
  const { plasmicData } = props;
  const router = useRouter();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    // Pass in the data fetched in getStaticProps as prefetchedData
    <PlasmicRootProvider
      pageParams={pageMeta.params}
      pageQuery={router.query}
      loader={PLASMIC}
      prefetchedData={plasmicData}
    >
      {
        // plasmicData.entryCompMetas[0].name contains the name
        // of the component you fetched.
      }
      <PlasmicComponent component={pageMeta.name} />
    </PlasmicRootProvider>
  );
}
