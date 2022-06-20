/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: Removed authentication, customer and wishlist hooks
*/
import { fetcher } from './fetcher'
import { handler as useCart } from './cart/use-cart'
import { handler as useAddItem } from './cart/use-add-item'
import { handler as useUpdateItem } from './cart/use-update-item'
import { handler as useRemoveItem } from './cart/use-remove-item'
import { handler as useSearch } from './product/use-search'
import { handler as useProduct } from './product/use-product'
import { handler as useCategories } from './site/use-categories'
import { handler as useBrands } from './site/use-brands'
import { LOCAL_CART_ID } from './const'
export const localProvider = {
  locale: 'en-us',
  cartCookie: LOCAL_CART_ID,
  fetcher: fetcher,
  cart: { useCart, useAddItem, useUpdateItem, useRemoveItem },
  products: { useSearch, useProduct },
  site: { useCategories, useBrands }
}

export type LocalProvider = typeof localProvider
