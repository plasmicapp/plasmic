import {
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";
import { useQuery } from "@shopify/hydrogen";
import { PLASMIC } from "/src/plasmic-init";

export function usePlasmicData(components: string[]) {
  const { data, error } = useQuery([`plasmic`, ...components], async () => {
    const plasmicData = await PLASMIC.maybeFetchComponentData(...components);
    if (!plasmicData) {
      return null;
    }
    const queryData = await extractPlasmicQueryData(
      <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
        <PlasmicComponent component={plasmicData.entryCompMetas[0].name} />
      </PlasmicRootProvider>
    );

    return { plasmicData, queryData };
  });

  if (error) {
    throw error;
  }

  return data;
}
