import {
  PlasmicCanvasHost,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";
import { PLASMIC } from "/src/plasmic-init";

export const ClientPlasmicCanvasHost = PlasmicCanvasHost;
export const ClientPlasmicComponent = PlasmicComponent;

// Hydrogen doesn't allow passing PLASMIC from a server to client component, so we omit
// that prop from `ClientPlasmicRootProviderProps` and instead pass it in from here.
type ClientPlasmicRootProviderProps = Omit<
  Parameters<typeof PlasmicRootProvider>[0],
  "loader"
>;
export function ClientPlasmicRootProvider(
  props: ClientPlasmicRootProviderProps
) {
  return <PlasmicRootProvider loader={PLASMIC} {...props} />;
}
