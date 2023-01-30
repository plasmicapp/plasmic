/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None
*/

import type {
  HookFetcherContext,
  MutationHookContext,
} from "@plasmicpkgs/commerce";
import { useRemoveItem, UseRemoveItem } from "@plasmicpkgs/commerce";
import { useCallback } from "react";
import { Mutation, MutationCheckoutLineDeleteArgs } from "../schema";
import { LineItem, RemoveItemHook } from "../types/cart";
import { checkoutToCart, getCheckoutId } from "../utils";
import * as mutation from "../utils/mutations";
import useCart from "./use-cart";

export default useRemoveItem as UseRemoveItem<typeof handler>;

export const handler = {
  fetchOptions: { query: mutation.CheckoutLineDelete },
  async fetcher({
    input: { itemId },
    options,
    fetch,
  }: HookFetcherContext<RemoveItemHook>) {
    const data = await fetch<Mutation, MutationCheckoutLineDeleteArgs>({
      ...options,
      variables: {
        checkoutId: getCheckoutId().checkoutId,
        lineId: itemId,
      },
    });
    return checkoutToCart(data.checkoutLineDelete);
  },
  useHook: ({ fetch }: MutationHookContext<RemoveItemHook>) => <
    T extends LineItem | undefined = undefined
  >() => {
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
