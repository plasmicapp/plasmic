import { Registerable } from "./registerable";
import {
  registerCommerceProvider,
  CommerceProviderComponent,
} from "./registerCommerceProvider";
export * from "./registerable";

export * from "./saleor";

export function registerAll(loader?: Registerable) {
  registerCommerceProvider(loader);
}

export { registerCommerceProvider, CommerceProviderComponent };
