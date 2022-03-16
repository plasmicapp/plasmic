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

export const localProvider = {
  locale: 'en-us',
  cartCookie: 'LOCAL_CART',
  fetcher: fetcher,
  cart: { useCart, useAddItem, useUpdateItem, useRemoveItem },
  products: { useSearch },
}

export type LocalProvider = typeof localProvider
