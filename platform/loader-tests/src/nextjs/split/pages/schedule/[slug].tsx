import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetServerSidePropsContext } from "next";
import * as React from "react";
import { PLASMIC } from "../../init";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const variation = await PLASMIC.getActiveVariation({
    req: context.req,
    res: context.res,
    traits: {
      time: "2200-01-01T00:00:00.000Z",
    },
  });
  const plasmicData = await PLASMIC.fetchComponentData("HomePage");
  return {
    props: {
      plasmicData,
      variation,
    },
  };
}

export default function Segment(props: {
  plasmicData: ComponentRenderData;
  variation: Record<string, string>;
}) {
  const { plasmicData, variation } = props;
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      variation={variation}
    >
      <PlasmicComponent component="HomePage" />
    </PlasmicRootProvider>
  );
}
