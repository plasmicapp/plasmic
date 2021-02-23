import { PlasmicConfig } from "../utils/config-utils";

export function ensureProjectIcons(config: PlasmicConfig) {
  for (const proj of config.projects) {
    if (!proj.icons) {
      proj.icons = [];
    }
  }
  return config;
}
