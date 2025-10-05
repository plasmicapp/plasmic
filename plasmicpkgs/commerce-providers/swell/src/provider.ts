/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: Added storeId and publicKey parameters
*/
import swell from "swell-js";

import { CommerceExtraFeatures, Fetcher } from "@plasmicpkgs/commerce";
import { handler as useAddItem } from "./cart/use-add-item";
import { handler as useCart } from "./cart/use-cart";
import { handler as useRemoveItem } from "./cart/use-remove-item";
import { handler as useUpdateItem } from "./cart/use-update-item";
import { SWELL_CHECKOUT_ID_COOKIE } from "./const";
import fetcher from "./fetcher";
import { handler as useProduct } from "./product/use-product";
import { handler as useSearch } from "./product/use-search";
import { handler as useBrands } from "./site/use-brands";
import { handler as useCategories } from "./site/use-categories";

export const getSwellProvider = (storeId: string, publicKey: string) => {
  // Their types claim `init` is a named export, but examining the JS files in
  // dist/, you can see it's actually a function on the default export.
  // @ts-expect-error swell-js types are wrong
  swell.init(storeId, publicKey);

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
