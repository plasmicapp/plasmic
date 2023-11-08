import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import Badge from "./components/Badge";
import { Fetcher, FetcherCredentialsProvider } from "./components/Fetch";
import config from "./config.json";
export const PLASMIC = initPlasmicLoader(config);

PLASMIC.registerComponent(Badge, {
  name: "Badge",
  props: {
    name: "string",
  },
});

PLASMIC.registerComponent(Fetcher, {
  name: "Fetcher",
  props: {
    children: "slot",
  },
});
PLASMIC.registerGlobalContext(FetcherCredentialsProvider, {
  name: "FetcherCredentialsProvider",
  props: {
    token: "string",
  },
});
