import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import Badge from "./components/Badge";
import config from "./config.json";

const DATA_HOST = undefined; // __DATA_HOST__

// @ts-expect-error globalThis
globalThis["__PLASMIC_DATA_HOST"] = DATA_HOST ?? "http://localhost:3003";

export const PLASMIC = initPlasmicLoader({
  ...config,
  platformOptions: {
    nextjs: {
      appDir: true,
    },
  },
});

PLASMIC.registerComponent(Badge, {
  name: "Badge",
  props: {
    name: "string",
  },
});
