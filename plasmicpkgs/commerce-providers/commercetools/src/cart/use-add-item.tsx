import { Cart, CartUpdate, ClientResponse } from "@commercetools/platform-sdk";
import type { MutationHook } from "@plasmicpkgs/commerce";
import { useAddItem, UseAddItem } from "@plasmicpkgs/commerce";
import { useCallback } from "react";
import type { AddItemHook } from "../types/cart";
import {
  getActiveCart,
  normalizeCart,
  removeCartCookie,
  setCartId,
} from "../utils";
import useCart from "./use-cart";

export default useAddItem as UseAddItem<typeof handler>;

export const handler: MutationHook<AddItemHook> = {
  fetchOptions: {
    query: "cart",
    method: "post",
  },
  async fetcher({ input: item, options, fetch, provider }) {
    const activeCart = await getActiveCart(fetch);
    if (
      (item.quantity &&
        (!Number.isInteger(item.quantity) || item.quantity! < 1)) ||
      !activeCart
    ) {
      return undefined;
    }
    const updatedCart = await fetch<ClientResponse<Cart>, CartUpdate>({
      query: "carts",
      method: "post",
      variables: {
        id: activeCart.id,
      },
      body: {
        version: activeCart.version,
        actions: [
          {
            action: "addLineItem",
            variantId: +item.variantId,
            productId: item.productId,
            quantity: item.quantity ?? 1,
          },
        ],
      },
    });
    if (updatedCart.body) {
      setCartId(updatedCart.body.id);
    } else {
      removeCartCookie();
    }
    return updatedCart.body
      ? normalizeCart(updatedCart.body, provider!.locale)
      : undefined;
  },
  useHook:
    ({ fetch }) =>
    () => {
      const { mutate } = useCart();
      return useCallback(
        async function addItem(input) {
          const data = await fetch({ input });
          await mutate(data, false);
          return data;
        },
        [fetch, mutate]
      );
    },
};
