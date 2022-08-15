/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes:None
*/

import { useMemo } from "react";
import { useCart as useCommerceCart, UseCart } from "@plasmicpkgs/commerce";

import { SWRHook } from "@plasmicpkgs/commerce";
import { checkoutCreate, checkoutToCart, getCheckoutId } from "../utils";
import * as query from "../utils/queries";
import { GetCartHook } from "../types/cart";

export default useCommerceCart as UseCart<typeof handler>;

export const handler: SWRHook<GetCartHook> = {
  fetchOptions: {
    query: query.CheckoutOne,
  },
  async fetcher({ input: { cartId: checkoutId }, options, fetch }) {
    let checkout;

    if (checkoutId) {
      const checkoutId = getCheckoutId().checkoutToken;
      const data = await fetch({
        ...options,
        variables: { checkoutId },
      });

      checkout = data;
    }

    if (checkout?.completedAt || !checkoutId) {
      checkout = await checkoutCreate(fetch);
    }

    return checkoutToCart(checkout);
  },
  useHook:
    ({ useData }) =>
    (input) => {
      const response = useData({
        swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
      });
      return useMemo(
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
