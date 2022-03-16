/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes:
    - Implemented a local cart
    - The items are added to local storage.
*/
import {  CommerceError, useAddItem, UseAddItem } from '@plasmicpkgs/commerce'
import { MutationHook } from '@plasmicpkgs/commerce'
import { useCallback } from 'react';
import useCart from './use-cart';
import data from "../data.json";
import { LOCAL_CART_URL } from '../const';
import { createCart } from '../utils/create-cart';

export default useAddItem as UseAddItem<typeof handler>
export const handler: MutationHook<any> = {
  fetchOptions: {
    query: '',
  },
  async fetcher({ input: item, options, fetch }) {
    if (
      item.quantity &&
      (!Number.isInteger(item.quantity) || item.quantity! < 1)
    ) {
      throw new CommerceError({
        message: 'The item quantity has to be a valid integer greater than 0',
      })
    }

    const lineItem = 
      {
        variantId: item.variantId,
        quantity: item.quantity ?? 1,
      };

    let cart;
    if (!localStorage.getItem(LOCAL_CART_URL)) {
      cart = createCart();
    } else {
      cart = JSON.parse(localStorage.getItem(LOCAL_CART_URL)!);
    }
    
    for (const product of data.products) {
      if (product.id === item.variantId || product.variants.some(productVariant => productVariant.id === item.variantId)) {
        cart.lineItems.push(lineItem);
        cart.totalPrice += product.price.value * (item.quantity ?? 1);
        cart.currency.code = product.price.currencyCode;
      }
    }
    localStorage.setItem(LOCAL_CART_URL, JSON.stringify(cart));
    return cart;
  },
  useHook:
    ({ fetch }) =>
    () => {
      const { mutate } = useCart()
      return useCallback(
        async function addItem(input) {
          const data = await fetch({ input });
          await mutate(data, false)
          return data
        },
        [fetch, mutate]
      )
    },
}
