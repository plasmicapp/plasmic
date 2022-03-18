import { Registerable } from "./registerable";
import { registerCommerceProvider } from "./registerCommerceProvider";
export * from "./registerable";

export * from "./swell";

export function registerAll(loader?: Registerable) {
  registerCommerceProvider(loader);
}

export { registerCommerceProvider }