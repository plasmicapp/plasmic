import { Registerable } from "./registerable";
import {
  CommerceProviderComponent,
  registerCommerceProvider,
} from "./registerCommerceProvider";
export * from "./registerable";

export * from "./saleor";

export function registerAll(loader?: Registerable) {
  registerCommerceProvider(loader);
}

export { CommerceProviderComponent, registerCommerceProvider };
