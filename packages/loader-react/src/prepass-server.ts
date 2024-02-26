import {
  extractPlasmicQueryData as internalExtractQueryData,
  plasmicPrepass as internalPlasmicPrepass,
} from "@plasmicapp/prepass";
import {
  handlePlasmicPrepassContext,
  handlePrepassPlasmicComponent,
  handlePrepassPlasmicRootComponent,
} from "./loader-server";
import type { PlasmicRootProvider } from "./PlasmicRootProvider";

/**
 * Performs a prepass over Plasmic content, kicking off the necessary
 * data fetches, and populating the fetched data into a cache.  This
 * cache can be passed as prefetchedQueryData into PlasmicRootProvider.
 *
 * To limit rendering errors that can occur when you do this, we recommend
 * that you pass in _only_ the PlasmicComponents that you are planning to use
 * as the argument.  For example:
 *
 *   const cache = await extractPlasmicQueryData(
 *     <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
 *       <PlasmicComponent component="Home" componentProps={{
 *         // Specify the component prop overrides you are planning to use
 *         // to render the page, as they may change what data is fetched.
 *         ...
 *       }} />
 *       <PlasmicComponent component="NavBar" componentProps={{
 *         ...
 *       }} />
 *       ...
 *     </PlasmicRootProvider>
 *   );
 *
 * If your PlasmicComponent will be wrapping components that require special
 * context set up, you should also wrap the element above with those context
 * providers.
 *
 * You should avoid passing in elements that are not related to Plasmic, as any
 * rendering errors from those elements during the prepass may result in data
 * not being populated in the cache.
 *
 * @param element a React element containing instances of PlasmicComponent.
 *   Will attempt to satisfy all data needs from usePlasmicDataQuery()
 *   in this element tree.
 * @returns an object mapping query key to fetched data
 */
export async function extractPlasmicQueryData(
  element: React.ReactElement
): Promise<Record<string, any>> {
  return await internalExtractQueryData(element, handleClientComponentRef);
}

/**
 * @deprecated Maintained for backwards compatibility
 */
export async function plasmicPrepass(
  element: React.ReactElement
): Promise<void> {
  return internalPlasmicPrepass(element, handleClientComponentRef);
}

function handleClientComponentRef(elt: React.ReactElement) {
  try {
    const refId: string = (elt.type as any).$$id;
    if (refId.includes("PlasmicRootProvider")) {
      const props: Parameters<typeof PlasmicRootProvider>[0] = elt.props as any;
      if (props.loader) {
        handlePrepassPlasmicRootComponent(props);
      }
      return;
    } else if (
      refId.includes("PlasmicComponent") &&
      elt.props?.component != null
    ) {
      return handlePrepassPlasmicComponent(elt.props);
    } else if (
      refId.includes("PlasmicPrepassContext") &&
      elt.props?.cache != null
    ) {
      return handlePlasmicPrepassContext(elt.props);
    }
  } catch (err) {
    console.warn("Error processing client reference: ", err);
  }
  return;
}
