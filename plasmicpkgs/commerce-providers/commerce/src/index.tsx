import { Registerable } from "./registerable";
import { registerAddToCartButton } from "./registerAddToCartButton";
import { registerProductCollection } from "./registerProductCollection";
import { registerProductMedia } from "./registerProductMedia";
import { registerProductPrice } from "./registerProductPrice";
import { registerProductQuantity } from "./registerProductQuantity";
import { registerTextField } from "./registerProductTextField";
import { registerProductVariantPicker } from "./registerProductVariantPicker";
import { registerUseCart } from "./registerUseCart";

export * from "./registerable";

export * from "./commerce";
export * from "./utils/types";
export * from "./utils/errors";
export * from "./types/product";

export * from "./product/use-search";
export * from "./site/use-categories";
export * from "./site/use-brands";
export * from "./cart/use-cart";
export * from "./cart/use-add-item";
export * from "./cart/use-remove-item";
export * from "./cart/use-update-item";

export { default as useSearch } from "./product/use-search";
export { default as useCategories } from "./site/use-categories";
export { default as useBrands } from "./site/use-brands";
export { default as useCart } from "./cart/use-cart";
export { default as useAddItem } from "./cart/use-add-item";
export { default as useRemoveItem } from "./cart/use-remove-item";
export { default as useUpdateItem } from "./cart/use-update-item";

export * as CartType from "./types/cart";
export * as ProductTypes from "./types/product";
export * as SiteTypes from "./types/site";

export { CommerceAPIConfig } from "./api/index";

export function registerAll(loader?: Registerable) {
  registerProductCollection(loader);
  registerTextField(loader);
  registerProductPrice(loader);
  registerProductMedia(loader);
  registerUseCart(loader);
  registerAddToCartButton(loader);
  registerProductQuantity(loader);
  registerProductVariantPicker(loader);
}
