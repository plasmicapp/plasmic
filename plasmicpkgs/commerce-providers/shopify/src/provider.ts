/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes:
    - Removed authentication, customer and wishlist hooks.
    - Added storeDomain and accessToken parameters.
*/
import { Fetcher } from "@plasmicpkgs/commerce";
import { handler as useAddItem } from "./cart/use-add-item";
import { handler as useCart } from "./cart/use-cart";
import { handler as useRemoveItem } from "./cart/use-remove-item";
import { handler as useUpdateItem } from "./cart/use-update-item";
import { SHOPIFY_CART_ID_COOKIE } from "./const";
import { getFetcher } from "./fetcher";
import { handler as useProduct } from "./product/use-product";
import { handler as useSearch } from "./product/use-search";
import { handler as useBrands } from "./site/use-brands";
import { handler as useCategories } from "./site/use-categories";

export const getShopifyProvider = (
  storeDomain: string,
  accessToken: string
) => ({
  locale: "en-us",
  cartCookie: SHOPIFY_CART_ID_COOKIE,
  cart: { useCart, useAddItem, useUpdateItem, useRemoveItem },
  fetcher: getFetcher(storeDomain, accessToken),
  products: { useSearch, useProduct },
  site: { useCategories, useBrands },
});

export type ShopifyProvider = {
  locale: string;
  cartCookie: string;
  fetcher: Fetcher;
  cart: {
    useCart: typeof useCart;
    useAddItem: typeof useAddItem;
    useUpdateItem: typeof useUpdateItem;
    useRemoveItem: typeof useRemoveItem;
  };
  products: {
    useSearch: typeof useSearch;
    useProduct: typeof useProduct;
  };
  site: {
    useCategories: typeof useCategories;
    useBrands: typeof useBrands;
  };
};
