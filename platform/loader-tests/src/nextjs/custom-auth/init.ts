import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import config from "./config.json";

export const PLASMIC = initPlasmicLoader(config);
