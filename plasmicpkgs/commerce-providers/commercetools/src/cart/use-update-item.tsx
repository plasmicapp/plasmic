import { Cart, CartUpdate, ClientResponse } from "@commercetools/platform-sdk";
import type { MutationHook, MutationHookContext } from "@plasmicpkgs/commerce";
import {
  useUpdateItem,
  UseUpdateItem,
  ValidationError,
} from "@plasmicpkgs/commerce";
import debounce from "debounce";
import { useCallback } from "react";
import type { LineItem, UpdateItemHook } from "../types/cart";
import {
  getActiveCart,
  normalizeCart,
  removeCartCookie,
  setCartId,
} from "../utils";
import useCart from "./use-cart";
import { handler as removeItemHandler } from "./use-remove-item";

export type UpdateItemActionInput<T = any> = T extends LineItem
  ? Partial<UpdateItemHook["actionInput"]>
  : UpdateItemHook["actionInput"];

export default useUpdateItem as UseUpdateItem<typeof handler>;

export const handler: MutationHook<UpdateItemHook> = {
  fetchOptions: {
    query: "cart",
    method: "post",
  },
  async fetcher({ input: { item, itemId }, options, fetch, provider }) {
    if (Number.isInteger(item.quantity)) {
      // Also allow the update hook to remove an item if the quantity is lower than 1
      if (item.quantity! < 1) {
        return removeItemHandler.fetcher?.({
          options: removeItemHandler.fetchOptions,
          input: { itemId },
          fetch,
          provider,
        });
      }
    } else if (item.quantity) {
      throw new ValidationError({
        message: "The item quantity has to be a valid integer",
      });
    }

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
            action: "changeLineItemQuantity",
            lineItemId: itemId,
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
    ({ fetch }: MutationHookContext<UpdateItemHook>) =>
    <T extends LineItem | undefined = undefined>(
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
