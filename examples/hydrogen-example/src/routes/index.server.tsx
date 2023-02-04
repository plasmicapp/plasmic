import { usePlasmicData } from "/src/lib/plasmic";
import {
  PlasmicClientComponent,
  PlasmicClientRootProvider,
} from "/src/lib/plasmic-helpers.client";

export default function IndexPage() {
  // If the url is /pages/hello, then `handle` will be "hello". We convert this into the page path
  // that we used in Plasmic for the corresponding page.
  const data = usePlasmicData("/");
  const { plasmicData, queryData } = data;
  return (
    <PlasmicClientRootProvider
      prefetchedData={plasmicData}
      prefetchedQueryData={queryData}
    >
      <PlasmicClientComponent component={plasmicData.entryCompMetas[0].name} />
    </PlasmicClientRootProvider>
  );
}
