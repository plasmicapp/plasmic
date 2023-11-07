import { PLASMIC } from "@/plasmic-init";
import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";

export default function PlasmicHost() {
  return PLASMIC && <PlasmicCanvasHost />;
}
