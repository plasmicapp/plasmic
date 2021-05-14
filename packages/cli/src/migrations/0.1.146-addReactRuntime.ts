import { PlasmicConfig } from "../utils/config-utils";

export function ensureReactRuntime(config: PlasmicConfig) {
  if (!config.code.reactRuntime) {
    config.code.reactRuntime = "classic";
  }
  return config;
}
