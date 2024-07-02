import { LIBRARY_PROJECT_CONFIG, registerCodeComponents } from "@/plasmic-init";
import {
  PlasmicCanvasHost,
  initPlasmicLoader,
} from "@plasmicapp/loader-nextjs";

const PLASMIC = initPlasmicLoader({
  projects: [LIBRARY_PROJECT_CONFIG],
  preview: true,
});

// It will be required to register all the code components that you want to be available
// in the Plasmic studio.
registerCodeComponents(PLASMIC);

export default function PlasmicHost() {
  return PLASMIC && <PlasmicCanvasHost />;
}
