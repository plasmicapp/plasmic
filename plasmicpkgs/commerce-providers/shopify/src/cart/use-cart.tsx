/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import {
  CartType,
  SWRHook,
  UseCart,
  useCart as useCommerceCart,
} from "@plasmicpkgs/commerce";
import Cookies from "js-cookie";
import { useMemo } from "react";
import { SHOPIFY_CART_ID_COOKIE, SHOPIFY_CHECKOUT_URL_COOKIE } from "../const";
import {
  GetCartQuery,
  GetCartQueryVariables,
} from "../utils/graphql/gen/graphql";
import { normalizeCart } from "../utils/normalize";
import { getCartQuery } from "../utils/queries/get-cart-query";

export default useCommerceCart as UseCart<typeof handler>;

export const handler: SWRHook<CartType.GetCartHook> = {
  fetchOptions: {
    query: getCartQuery.toString(),
  },
  async fetcher({ input: { cartId }, options, fetch }) {
    if (cartId) {
      const { cart } = await fetch<GetCartQuery, GetCartQueryVariables>({
        ...options,
        variables: {
          cartId,
        },
      });
      if (!cart) {
        Cookies.remove(SHOPIFY_CART_ID_COOKIE);
        Cookies.remove(SHOPIFY_CHECKOUT_URL_COOKIE);
        return null;
      } else {
        return normalizeCart(cart);
      }
    }
    return null;
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
