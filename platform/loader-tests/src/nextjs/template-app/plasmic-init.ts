import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import * as NextNavigation from "next/navigation";
import Badge from "./components/Badge";
import config from "./config.json";

const DATA_HOST = undefined; // __DATA_HOST__

// @ts-expect-error globalThis
globalThis["__PLASMIC_DATA_HOST"] = DATA_HOST ?? "http://localhost:3003";

export const PLASMIC = initPlasmicLoader({
  ...config,
  // Needed for Next.js app router support.
  nextNavigation: NextNavigation,
});

PLASMIC.registerComponent(Badge, {
  name: "Badge",
  props: {
    name: "string",
  },
});
