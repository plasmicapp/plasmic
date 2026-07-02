import { HydrogenRouteProps } from "@shopify/hydrogen";
import { usePlasmicData } from "/src/lib/plasmic";
import {
  ClientPlasmicComponent,
  ClientPlasmicRootProvider,
} from "/src/lib/plasmic-helpers.client";

export default function PlasmicPage({ params, response }: HydrogenRouteProps) {
  const { handle } = params;
  console.log(handle);

  // If the url is /pages/hello, then `handle` will be "hello". We convert this into the page path
  // that we used in Plasmic for the corresponding page.
  const data = usePlasmicData([`/${handle}`]);
  if (!data) {
    return response.redirect("/");
  }
  const { plasmicData, queryData } = data;
  return (
    <ClientPlasmicRootProvider
      prefetchedData={plasmicData}
      prefetchedQueryData={queryData}
    >
      <ClientPlasmicComponent component={plasmicData.entryCompMetas[0].name} />
    </ClientPlasmicRootProvider>
  );
}
