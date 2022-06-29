/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes:
    - Removed customer and auth hooks.
    - Added saleor_api_url parameters.
*/

import { CHECKOUT_ID_COOKIE } from './const'
import { handler as useCart } from './cart/use-cart'
import { handler as useAddItem } from './cart/use-add-item'
import { handler as useUpdateItem } from './cart/use-update-item'
import { handler as useRemoveItem } from './cart/use-remove-item'
import { handler as useCategories } from './site/use-categories'
import { handler as useBrands } from './site/use-brands'
import { handler as useSearch } from './product/use-search'
import { handler as useProduct } from './product/use-product'
import { Fetcher } from '@plasmicpkgs/commerce'
import { getFetcher } from './fetcher'

export const getSaleorProvider = (saleorApiUrl: string,) => ({
  locale: 'en-us',
  cartCookie: CHECKOUT_ID_COOKIE,
  fetcher: getFetcher(saleorApiUrl),
  cart: { useCart, useAddItem, useUpdateItem, useRemoveItem },
  products: { useSearch, useProduct },
  site: { useCategories, useBrands }
})





export type SaleorProvider = {
  locale: string;
  cartCookie: string;
  fetcher: Fetcher;
  cart: {
    useCart: typeof useCart;
    useAddItem: typeof useAddItem;
    useUpdateItem: typeof useUpdateItem;
    useRemoveItem: typeof useRemoveItem
  };
  products: {
    useSearch: typeof useSearch
    useProduct: typeof useProduct
  };
  site: {
    useCategories: typeof useCategories
    useBrands: typeof useBrands
  }
}