import * as commerceCommon from "@plasmicpkgs/commerce";

export function register() {
  commerceCommon.registerAll();
  (globalThis as any).__PlasmicCommerceCommon = commerceCommon;
}

register();
