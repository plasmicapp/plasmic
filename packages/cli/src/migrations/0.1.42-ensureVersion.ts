import { PlasmicConfig } from "../utils/config-utils";

export function ensureVersion(config: PlasmicConfig) {
  for (const proj of config.projects) {
    if (!proj.version) {
      proj.version = "latest";
    }
  }
  return config;
}
