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
      utm_campaign: context.query.utm_campaign as string,
    },
  });
  const externalIds = PLASMIC.getExternalVariation(variation);
  const plasmicData = await PLASMIC.fetchComponentData("ExternalIds");
  return {
    props: {
      plasmicData,
      variation,
      externalIds,
    },
  };
}

export default function External(props: {
  plasmicData: ComponentRenderData;
  variation: Record<string, string>;
  externalIds: Record<string, string>;
}) {
  const { plasmicData, variation, externalIds } = props;
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      variation={variation}
    >
      <PlasmicComponent
        component="ExternalIds"
        componentProps={{
          children: (
            <div>
              {Object.keys(externalIds).map((id) => {
                return (
                  <p key={id}>
                    {id}: {externalIds[id]}
                  </p>
                );
              })}
            </div>
          ),
        }}
      />
    </PlasmicRootProvider>
  );
}
