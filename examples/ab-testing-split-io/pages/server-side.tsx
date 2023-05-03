import * as React from "react";
import {
  PlasmicComponent,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetServerSideProps } from "next";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../plasmic-init";

import { SplitFactory } from "@splitsoftware/splitio";

// Reference: https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK

// Feature name that you want to use for the Split treatment
// This should match the name of the feature in Split
const featureName = "my_ab_test";

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  variation?: Record<string, string>;
}) {
  const { plasmicData, variation } = props;
  const router = useRouter();

  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];

  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
      pageQuery={router.query}
      variation={variation}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const plasmicData = await PLASMIC.maybeFetchComponentData("Homepage");
  if (!plasmicData) {
    return { props: {} };
  }

  // Initialize Split SDK
  const splitFactory = SplitFactory({
    core: {
      authorizationKey: "AUTHORIZATION_KEY",
    },
  });
  const client = splitFactory.client();
  await client.ready();

  // Get the Split treatment
  const treatments = client.getTreatments("CUSTOMER_ID", [featureName]);

  // Pass the Split treatment to the PlasmicRootProvider
  // It's required to prefix the feature name with "ext."
  // Both the name of the feature in Split and the name of the external id in Plasmic must match
  const variation = {
    [`ext.${featureName}`]: treatments[featureName],
  };

  return { props: { plasmicData, variation } };
};
