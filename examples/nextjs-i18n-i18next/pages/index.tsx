import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Error from "next/error";
import { useRouter } from "next/router";
import { usePlasmicTranslator } from "../i18n";
import { PLASMIC } from "../plasmic-init";

/**
 * For each page, pre-fetch the data we need to render it
 */
export const getStaticProps: GetStaticProps = async (context) => {
  const plasmicData = await PLASMIC.fetchComponentData("/");

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

  const trans = await serverSideTranslations(context.locale ?? "en");

  // Pass the data in as props.
  return {
    props: { plasmicData, queryCache, ...trans },

    // Using incremental static regeneration, will invalidate this page
    // after 300s (no deploy webhooks needed)
    revalidate: 300,
  };
};

/**
 * Actually render the page!
 */
export default function HomePage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  const translator = usePlasmicTranslator();
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
      translator={translator}
    >
      <PlasmicComponent
        component={pageMeta.displayName}
        componentProps={{
          englishButton: {
            locale: "en",
            color: router.locale === "en" ? "blue" : "blueBorder",
          },
          spanishButton: {
            locale: "es",
            color: router.locale === "es" ? "blue" : "blueBorder",
          },
        }}
      />
    </PlasmicRootProvider>
  );
}
