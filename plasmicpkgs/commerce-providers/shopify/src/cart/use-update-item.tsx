/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import type {
  HookFetcherContext,
  MutationHookContext,
} from "@plasmicpkgs/commerce";
import {
  CartType,
  useUpdateItem,
  UseUpdateItem,
  ValidationError,
} from "@plasmicpkgs/commerce";
import debounce from "debounce";
import { useCallback } from "react";
import { getCartId } from "../utils/get-cart-id";
import {
  EditCartItemsMutation,
  EditCartItemsMutationVariables,
} from "../utils/graphql/gen/graphql";
import { editCartItemsMutation } from "../utils/mutations/cart";
import { normalizeCart } from "../utils/normalize";
import useCart from "./use-cart";
import { handler as removeItemHandler } from "./use-remove-item";

export type UpdateItemActionInput<T = any> = T extends CartType.LineItem
  ? Partial<CartType.UpdateItemHook["actionInput"]>
  : CartType.UpdateItemHook["actionInput"];

export default useUpdateItem as UseUpdateItem<typeof handler>;

export const handler = {
  fetchOptions: {
    query: editCartItemsMutation.toString(),
  },
  async fetcher({
    input: { itemId, item },
    options,
    fetch,
  }: HookFetcherContext<CartType.UpdateItemHook>) {
    if (Number.isInteger(item.quantity)) {
      // Also allow the update hook to remove an item if the quantity is lower than 1
      if (item.quantity! < 1) {
        return removeItemHandler.fetcher({
          options: removeItemHandler.fetchOptions,
          input: { itemId },
          fetch,
        });
      }
    } else if (item.quantity) {
      throw new ValidationError({
        message: "The item quantity has to be a valid integer",
      });
    }
    const { cartLinesUpdate } = await fetch<
      EditCartItemsMutation,
      EditCartItemsMutationVariables
    >({
      ...options,
      variables: {
        cartId: getCartId(),
        lines: [
          {
            id: itemId,
            quantity: item.quantity,
          },
        ],
      },
    });

    return normalizeCart(cartLinesUpdate?.cart);
  },
  useHook:
    ({ fetch }: MutationHookContext<CartType.UpdateItemHook>) =>
    <T extends CartType.LineItem | undefined = undefined>(
      ctx: {
        item?: T;
        wait?: number;
      } = {}
    ) => {
      const { item } = ctx;
      const { mutate } = useCart() as any;

      return useCallback(
        debounce(async (input: UpdateItemActionInput<T>) => {
          const itemId = input.id ?? item?.id;
          if (!itemId || input.quantity == null) {
            throw new ValidationError({
              message: "Invalid input used for this operation",
            });
          }

          const data = await fetch({
            input: {
              item: {
                quantity: input.quantity,
              },
              itemId,
            },
          });
          await mutate(data, false);
          return data;
        }, ctx.wait ?? 500),
        [fetch, mutate]
      );
    },
};
