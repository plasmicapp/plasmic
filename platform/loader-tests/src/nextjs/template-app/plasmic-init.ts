import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import Badge from "./components/Badge";
import { NoPrefetchSection, ServerSection } from "./components/SsrSections";
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

PLASMIC.registerComponent(ServerSection, {
  name: "ServerSection",
  props: {
    heading: "string",
    children: "slot",
  },
});

// Registered without `subtreePrefetchingConfig: false` since the flag only matters
// when syncing the registration in studio. At runtime, subtree prefetch behavior
// comes from the published bundle, which already has `subtreePrefetchingConfig: false`.
PLASMIC.registerComponent(NoPrefetchSection, {
  name: "NoPrefetchSection",
  props: {
    heading: "string",
    children: "slot",
  },
});
