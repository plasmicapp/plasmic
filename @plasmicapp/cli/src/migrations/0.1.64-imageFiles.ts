import { PlasmicConfig } from "../utils/config-utils";

export function ensureImageFiles(config: PlasmicConfig) {
  if (!config.images) {
    config.images = {
      scheme: "inlined",
    };
  }
  for (const proj of config.projects) {
    if (!proj.images) {
      proj.images = [];
    }
  }
  return config;
}
