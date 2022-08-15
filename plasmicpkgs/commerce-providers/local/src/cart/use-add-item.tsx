/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes:
    - Implemented a local cart
    - The items are added to local storage.
*/
import {
  CommerceError,
  MutationHook,
  useAddItem,
  UseAddItem,
} from "@plasmicpkgs/commerce";
import { useCallback } from "react";
import data from "../data.json";
import { cartUpdate, getCart } from "../utils/cart";
import useCart from "./use-cart";

export default useAddItem as UseAddItem<typeof handler>;
export const handler: MutationHook<any> = {
  fetchOptions: {
    query: "use-add-item",
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

    const lineItem = {
      variantId: item.variantId,
      quantity: item.quantity ?? 1,
    };

    const cart = getCart();
    for (const product of data.products) {
      const variant = (product.variants as any[]).find(
        (variant) => variant.id === item.variantId
      );
      if (variant) {
        cart.totalPrice += variant.price * (item.quantity ?? 1);
        cart.currency.code = product.price.currencyCode;
        const currentLineItem = cart.lineItems.find(
          (item) => item.variantId === lineItem.variantId
        );
        if (!currentLineItem) {
          cart.lineItems.push(lineItem as any);
        } else {
          currentLineItem.quantity += lineItem.quantity;
        }
      }
    }

    return cartUpdate(cart);
  },
  useHook: ({ fetch }) => () => {
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
