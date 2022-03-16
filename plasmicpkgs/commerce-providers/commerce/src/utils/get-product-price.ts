import { Product } from "../types/product";

export const getProductPrice = (product: Product, variantId: string) =>
  product.variants.find(variant => variant.id === variantId)?.price ?? product.price.value