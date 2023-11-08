import { initPlasmicLoader } from "@plasmicapp/loader-react";
import config from "./config.json";
export const PLASMIC = initPlasmicLoader(config as any);
