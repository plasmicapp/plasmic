import { PlasmicConfig } from "../utils/config-utils";

export function ensureJsBundleThemes(config: PlasmicConfig) {
  for (const proj of config.projects) {
    if (!proj.jsBundleThemes) {
      proj.jsBundleThemes = [];
    }
  }
  return config;
}
