/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: Added storeId and publicKey parameters
*/
// @ts-ignore
import swell, { init } from "swell-js";

import { CommerceExtraFeatures, Provider } from "@plasmicpkgs/commerce";
import { SWELL_CHECKOUT_ID_COOKIE } from "./const";
import { handler as useCart } from "./cart/use-cart";
import { handler as useAddItem } from "./cart/use-add-item";
import { handler as useUpdateItem } from "./cart/use-update-item";
import { handler as useRemoveItem } from "./cart/use-remove-item";
import { handler as useSearch } from "./product/use-search";
import { handler as useProduct } from "./product/use-product";
import { handler as useCategories } from "./site/use-categories";
import { handler as useBrands } from "./site/use-brands";
import fetcher from "./fetcher";
import { Fetcher } from "@plasmicpkgs/commerce";

export const getSwellProvider = (storeId: string, publicKey: string) => {
  init(storeId, publicKey);

  return {
    locale: "en-us",
    cartCookie: SWELL_CHECKOUT_ID_COOKIE,
    swell,
    fetcher,
    cart: { useCart, useAddItem, useUpdateItem, useRemoveItem },
    products: { useSearch, useProduct },
    site: { useCategories, useBrands },
    extraFeatures: {
      includeSubCategories: true,
    },
  };
};

export type SwellProvider = {
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
  };
  site: {
    useCategories: typeof useCategories;
    useBrands: typeof useBrands;
  };
  extraFeatures: CommerceExtraFeatures;
  swell: any;
};

export default swell as any;
