import * as React from "react";
import {
  PlasmicComponent,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticProps } from "next";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../plasmic-init";

import {
  withSplitFactory,
  SplitTreatments,
} from "@splitsoftware/splitio-react";

// Reference: https://help.split.io/hc/en-us/articles/360038825091-React-SDK

const splitIOSettings: SplitIO.IBrowserSettings = {
  core: {
    authorizationKey: "AUTHORIZATION_KEY",
    key: "CUSTOMER_ID",
  },
};

// Feature name that you want to use for the Split treatment
// This should match the name of the feature in Split
const featureName = "my_ab_test";

function PlasmicLoaderPage(props: { plasmicData?: ComponentRenderData }) {
  const { plasmicData } = props;
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

export default withSplitFactory(splitIOSettings)(PlasmicLoaderPage);

export const getStaticProps: GetStaticProps = async () => {
  const plasmicData = await PLASMIC.maybeFetchComponentData("Homepage");
  if (!plasmicData) {
    // Component not found
    return { props: {} };
  }
  // Use revalidate if you want incremental static regeneration
  return { props: { plasmicData }, revalidate: 60 };
};
