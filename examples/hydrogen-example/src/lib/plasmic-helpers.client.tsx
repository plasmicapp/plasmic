import {
  PlasmicCanvasHost,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";
import { PLASMIC } from "/src/plasmic-init";

export const PlasmicClientCanvasHost = PlasmicCanvasHost;
export const PlasmicClientComponent = PlasmicComponent;

// Hydrogen doesn't allow passing PLASMIC from a server to client component, so we omit
// that prop from `PlasmicClientRootProviderProps` and instead pass it in from here.
type PlasmicClientRootProviderProps = Omit<
  Parameters<typeof PlasmicRootProvider>[0],
  "loader"
>;
export function PlasmicClientRootProvider(
  props: PlasmicClientRootProviderProps
) {
  return <PlasmicRootProvider loader={PLASMIC} {...props} />;
}
