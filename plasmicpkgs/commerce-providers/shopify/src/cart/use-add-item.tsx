/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import type { MutationHook } from "@plasmicpkgs/commerce";
import {
  CartType,
  CommerceError,
  useAddItem,
  UseAddItem,
} from "@plasmicpkgs/commerce";
import { useCallback } from "react";
import { cartCreate } from "../utils/cart-create";
import { getCartId } from "../utils/get-cart-id";
import {
  AddToCartMutation,
  AddToCartMutationVariables,
  CartLineInput,
} from "../utils/graphql/gen/graphql";
import { addToCartMutation } from "../utils/mutations/cart";
import { normalizeCart } from "../utils/normalize";
import useCart from "./use-cart";

export default useAddItem as UseAddItem<typeof handler>;

export const handler: MutationHook<CartType.AddItemHook> = {
  fetchOptions: {
    query: addToCartMutation.toString(),
  },
  async fetcher({ input: item, options, fetch }) {
    if (
      item.quantity &&
      (!Number.isInteger(item.quantity) || item.quantity! < 1)
    ) {
      throw new CommerceError({
        message: "The item quantity has to be a valid integer greater than 0",
      });
    }

    const lines: CartLineInput[] = [
      {
        merchandiseId: item.variantId,
        quantity: item.quantity ?? 1,
      },
    ];

    let cartId = getCartId();
    if (!cartId) {
      return await cartCreate(fetch, lines);
    } else {
      const { cartLinesAdd } = await fetch<
        AddToCartMutation,
        AddToCartMutationVariables
      >({
        ...options,
        variables: {
          cartId,
          lines,
        },
      });
      return normalizeCart(cartLinesAdd?.cart);
    }
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
