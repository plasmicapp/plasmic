// Disambiguate `initPlasmicLoader` and `NextJsPlasmicComponentLoader`.
// Prefer the "default" version since it is more permissive.
import { initPlasmicLoader, NextJsPlasmicComponentLoader } from "./dist/index";

export * from "./dist/index";
export * from "./dist/react-server";
export { initPlasmicLoader, NextJsPlasmicComponentLoader };
