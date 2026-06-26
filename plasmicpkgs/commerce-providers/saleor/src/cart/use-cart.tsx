/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes:None
*/

import { UseCart, useCart as useCommerceCart } from "@plasmicpkgs/commerce";
import { useMemo } from "react";

import { SWRHook } from "@plasmicpkgs/commerce";
import { GetCartHook } from "../types/cart";
import { checkoutCreate, checkoutToCart, getCheckoutId } from "../utils";
import * as query from "../utils/queries";

const _default: UseCart<typeof handler> = useCommerceCart as UseCart<
  typeof handler
>;
export default _default;

export const handler: SWRHook<GetCartHook> = {
  fetchOptions: {
    query: query.CheckoutOne,
  },
  async fetcher({ input: { cartId: checkoutId }, options, fetch }) {
    let checkout;

    if (checkoutId) {
      const checkoutToken = getCheckoutId().checkoutToken;
      const data = await fetch({
        ...options,
        variables: { checkoutId: checkoutToken },
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
