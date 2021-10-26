import { PlasmicConfig } from "../utils/config-utils";

export function ensureIndirect(config: PlasmicConfig) {
  for (const p of config.projects) {
    if (p.indirect === undefined) {
      p.indirect = false;
    }
  }
  return config;
}
