/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import type {
  HookFetcherContext,
  MutationHookContext,
} from "@plasmicpkgs/commerce";
import { useCallback } from "react";

import { CartType, useRemoveItem, UseRemoveItem } from "@plasmicpkgs/commerce";
import useCart from "./use-cart";
import { checkoutToCart } from "./utils";

type Cart = CartType.Cart;
type LineItem = CartType.LineItem;
type RemoveItemHook = CartType.RemoveItemHook;

export type RemoveItemFn<T = any> = T extends LineItem
  ? (input?: RemoveItemActionInput<T>) => Promise<Cart | null | undefined>
  : (input: RemoveItemActionInput<T>) => Promise<Cart | null>;

export type RemoveItemActionInput<T = any> = T extends LineItem
  ? Partial<RemoveItemHook["actionInput"]>
  : RemoveItemHook["actionInput"];

export default useRemoveItem as UseRemoveItem<typeof handler>;

export const handler = {
  fetchOptions: {
    query: "cart",
    method: "removeItem",
  },
  async fetcher({
    input: { itemId },
    options,
    fetch,
  }: HookFetcherContext<RemoveItemHook>) {
    const response = await fetch({ ...options, variables: [itemId] });

    return checkoutToCart(response);
  },
  useHook: ({ fetch }: MutationHookContext<RemoveItemHook>) => () => {
    const { mutate } = useCart();

    return useCallback(
      async function removeItem(input: { id: string }) {
        const data = await fetch({ input: { itemId: input.id } });
        await mutate(data, false);

        return data;
      },
      [fetch, mutate]
    );
  },
};
