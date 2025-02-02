/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import type {
  CartType,
  HookFetcherContext,
  MutationHookContext,
} from "@plasmicpkgs/commerce";
import {
  useRemoveItem,
  UseRemoveItem,
  ValidationError,
} from "@plasmicpkgs/commerce";
import { useCallback } from "react";
import type { ShopifyCart } from "../shopify-types";
import { getCartId } from "../utils/get-cart-id";
import {
  RemoveFromCartMutation,
  RemoveFromCartMutationVariables,
} from "../utils/graphql/gen/graphql";
import { removeFromCartMutation } from "../utils/mutations/cart";
import { normalizeCart } from "../utils/normalize";
import useCart from "./use-cart";

export type RemoveItemFn<T = any> = T extends CartType.LineItem
  ? (
      input?: RemoveItemActionInput<T>
    ) => Promise<ShopifyCart | null | undefined>
  : (input: RemoveItemActionInput<T>) => Promise<ShopifyCart | null>;

export type RemoveItemActionInput<T = any> = T extends CartType.LineItem
  ? Partial<CartType.RemoveItemHook["actionInput"]>
  : CartType.RemoveItemHook["actionInput"];

export default useRemoveItem as UseRemoveItem<typeof handler>;

export const handler = {
  fetchOptions: {
    query: removeFromCartMutation.toString(),
  },
  async fetcher({
    input: { itemId },
    options,
    fetch,
  }: HookFetcherContext<CartType.RemoveItemHook>) {
    const { cartLinesRemove } = await fetch<
      RemoveFromCartMutation,
      RemoveFromCartMutationVariables
    >({
      ...options,
      variables: { cartId: getCartId(), lineIds: [itemId] },
    });
    return normalizeCart(cartLinesRemove?.cart);
  },
  useHook:
    ({ fetch }: MutationHookContext<CartType.RemoveItemHook>) =>
    <T extends CartType.LineItem | undefined = undefined>(
      ctx: { item?: T } = {}
    ) => {
      const { item } = ctx;
      const { mutate } = useCart();
      const removeItem: RemoveItemFn<CartType.LineItem> = async (input) => {
        const itemId = input?.id ?? item?.id;

        if (!itemId) {
          throw new ValidationError({
            message: "Invalid input used for this operation",
          });
        }

        const data = await fetch({ input: { itemId } });
        await mutate(data, false);
        return data;
      };

      return useCallback(removeItem as RemoveItemFn<T>, [fetch, mutate]);
    },
};
