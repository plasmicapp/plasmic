import { PlasmicClientCanvasHost } from "/src/lib/plasmic-helpers.client";
import { PLASMIC } from "/src/plasmic-init";

export default function PlasmicHost() {
  return PLASMIC && <PlasmicClientCanvasHost />;
}
