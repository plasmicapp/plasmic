import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "plasmic-init";

export default function Page() {
  return PLASMIC && <PlasmicCanvasHost />;
}
