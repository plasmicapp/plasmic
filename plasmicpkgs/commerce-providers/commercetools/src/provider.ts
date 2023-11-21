import { Fetcher } from "@plasmicpkgs/commerce";
import { handler as useAddItem } from "./cart/use-add-item";
import { handler as useCart } from "./cart/use-cart";
import { handler as useRemoveItem } from "./cart/use-remove-item";
import { handler as useUpdateItem } from "./cart/use-update-item";
import { COMMERCETOOLS_CART_COOKIE } from "./const";
import { getFetcher } from "./fetcher";
import { handler as useProduct } from "./product/use-product";
import { handler as useSearch } from "./product/use-search";
import { handler as useBrands } from "./site/use-brands";
import { handler as useCategories } from "./site/use-categories";

export interface CommercetoolsCredentials {
  projectKey: string;
  clientId: string;
  clientSecret: string;
  region: string;
}

export const getCommercetoolsProvider = (
  creds: CommercetoolsCredentials,
  locale: string
) => ({
  locale,
  cartCookie: COMMERCETOOLS_CART_COOKIE,
  cart: { useCart, useAddItem, useRemoveItem, useUpdateItem },
  fetcher: getFetcher(creds),
  products: { useSearch, useProduct },
  site: { useCategories, useBrands },
});

export type CommercetoolsProvider = {
  locale: string;
  cartCookie: string;
  fetcher: Fetcher;
  cart: {
    useCart: typeof useCart;
    useAddItem: typeof useAddItem;
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
