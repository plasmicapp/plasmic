import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import config from "./config.json";
export const PLASMIC = initPlasmicLoader(config);
PLASMIC.registerTrait("utm_campaign", {
  type: "text",
  label: "UTM Campaign",
});
