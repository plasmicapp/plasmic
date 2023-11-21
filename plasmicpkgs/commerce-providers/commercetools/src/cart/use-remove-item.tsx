import {
  Cart as CommerceToolsCart,
  CartUpdate,
  ClientResponse,
} from "@commercetools/platform-sdk";
import type {
  HookFetcherContext,
  MutationHook,
  MutationHookContext,
} from "@plasmicpkgs/commerce";
import {
  UseRemoveItem,
  useRemoveItem,
  ValidationError,
} from "@plasmicpkgs/commerce";
import { useCallback } from "react";
import type { Cart, LineItem, RemoveItemHook } from "../types/cart";
import {
  getActiveCart,
  normalizeCart,
  removeCartCookie,
  setCartId,
} from "../utils";
import useCart from "./use-cart";

export type RemoveItemFn<T = any> = T extends LineItem
  ? (input?: RemoveItemActionInput<T>) => Promise<Cart | null | undefined>
  : (input: RemoveItemActionInput<T>) => Promise<Cart | null>;

export type RemoveItemActionInput<T = any> = T extends LineItem
  ? Partial<RemoveItemHook["actionInput"]>
  : RemoveItemHook["actionInput"];

export default useRemoveItem as UseRemoveItem<typeof handler>;

export const handler: MutationHook<RemoveItemHook> = {
  fetchOptions: {
    query: "cart",
    method: "post",
  },
  async fetcher({
    input: { itemId },
    options,
    fetch,
    provider,
  }: HookFetcherContext<RemoveItemHook>) {
    const activeCart = await getActiveCart(fetch);
    if (!itemId || !activeCart) {
      return undefined;
    }
    const updatedCart = await fetch<
      ClientResponse<CommerceToolsCart>,
      CartUpdate
    >({
      query: "carts",
      method: "post",
      variables: {
        id: activeCart.id,
      },
      body: {
        version: activeCart.version,
        actions: [
          {
            action: "removeLineItem",
            lineItemId: itemId,
          },
        ],
      },
    });
    if (updatedCart.body) {
      setCartId(updatedCart.body.id);
    } else {
      removeCartCookie();
    }
    return normalizeCart(updatedCart.body, provider!.locale);
  },
  useHook:
    ({ fetch }: MutationHookContext<RemoveItemHook>) =>
    <T extends LineItem | undefined = undefined>(ctx: { item?: T } = {}) => {
      const { item } = ctx;
      const { mutate } = useCart();
      const removeItem: RemoveItemFn<LineItem> = async (input) => {
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
