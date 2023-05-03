import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";

// Import Split SDK
import {
  withSplitFactory,
  SplitTreatments,
} from "@splitsoftware/splitio-react";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../plasmic-init";

// Reference: https://help.split.io/hc/en-us/articles/360038825091-React-SDK

const factory: SplitIO.IBrowserSettings = {
  core: {
    authorizationKey: "AUTHORIZATION_KEY",
    key: "CUSTOMER_ID",
  },
};

// Feature name that you want to use for the Split treatment
// This should match the name of the feature in Split
const featureName = "my_ab_test";

function PlasmicLoaderPage(props: {
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
    // Wrap the PlasmicRootProvider in SplitTreatments
    <SplitTreatments names={[featureName]}>
      {({ treatments, isReady }) => {
        if (isReady) {
          return (
            <PlasmicRootProvider
              loader={PLASMIC}
              prefetchedData={plasmicData}
              prefetchedQueryData={queryCache}
              pageParams={pageMeta.params}
              pageQuery={router.query}
              variation={{
                // Pass the Split treatment to the PlasmicRootProvider
                // It's required to prefix the feature name with "ext."
                // Both the name of the feature in Split and the name of the external id in Plasmic must match
                [`ext.${featureName}`]: treatments[featureName].treatment,
              }}
            >
              <PlasmicComponent component={pageMeta.displayName} />
            </PlasmicRootProvider>
          );
        }

        return null;
      }}
    </SplitTreatments>
  );
}

// Wrap the PlasmicLoaderPage in withSplitFactory
export default withSplitFactory(factory)(PlasmicLoaderPage);

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
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
