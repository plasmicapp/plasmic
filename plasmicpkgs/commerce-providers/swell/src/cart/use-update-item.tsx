/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import type {
  HookFetcherContext,
  MutationHookContext,
} from "@plasmicpkgs/commerce";
import { ValidationError } from "@plasmicpkgs/commerce";
import debounce from "debounce";
import { useCallback } from "react";
// import useUpdateItem, {
//   UpdateItemInput as UpdateItemInputBase,
//   UseUpdateItem,
// } from '@vercel/commerce/cart/use-update-item'
import { CartType, useUpdateItem, UseUpdateItem } from "@plasmicpkgs/commerce";
import { UpdateItemHook } from "../types/cart";
import useCart from "./use-cart";
import { handler as removeItemHandler } from "./use-remove-item";
import { checkoutToCart } from "./utils";
// export type UpdateItemInput<T = any> = T extends LineItem
//   ? Partial<UpdateItemInputBase<LineItem>>
//   : UpdateItemInputBase<LineItem>

export default useUpdateItem as UseUpdateItem<typeof handler>;

type CartItemBody = CartType.CartItemBody;
type LineItem = CartType.LineItem;

export type UpdateItemActionInput<T = any> = T extends LineItem
  ? Partial<UpdateItemHook["actionInput"]>
  : UpdateItemHook["actionInput"];

export const handler = {
  fetchOptions: {
    query: "cart",
    method: "updateItem",
  },
  async fetcher({
    input: { itemId, item },
    options,
    fetch,
  }: HookFetcherContext<UpdateItemHook>) {
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
    const response = await fetch({
      ...options,
      variables: [itemId, { quantity: item.quantity }],
    });

    return checkoutToCart(response);
  },
  useHook:
    ({ fetch }: MutationHookContext<UpdateItemHook>) =>
    <T extends LineItem | undefined = undefined>(
      ctx: {
        item?: T;
        wait?: number;
      } = {}
    ) => {
      const { item } = ctx;
      const { mutate, data: cartData } = useCart() as any;

      return useCallback(
        debounce(async (input: UpdateItemActionInput) => {
          const itemId = input.id ?? item?.id;
          if (!itemId) {
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
