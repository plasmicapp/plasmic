import { Registerable } from "./registerable";
import { registerCommerceProvider } from "./registerCommerceProvider";
export * from "./registerable";
export * from "./registerCommerceProvider";
export * from "./shopify";

export function registerAll(loader?: Registerable) {
  registerCommerceProvider(loader);
}
