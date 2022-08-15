/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes:
    - Before: just returned an empty cart.
    - Now: Read cart from local storage.
*/
import { SWRHook, useCart, UseCart } from "@plasmicpkgs/commerce";
import React from "react";
import { getCart } from "../utils/cart";

export default useCart as UseCart<typeof handler>;

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: "use-cart",
  },
  async fetcher({ input, options, fetch }) {
    return getCart(input.cartId);
  },
  useHook: ({ useData }) => (input) => {
    const response = useData({
      swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
    });
    return React.useMemo(
      () =>
        Object.create(response, {
          isEmpty: {
            get() {
              return (response.data?.lineItems.length ?? 0) <= 0;
            },
            enumerable: true,
          },
        }),
      [response]
    );
  },
};
