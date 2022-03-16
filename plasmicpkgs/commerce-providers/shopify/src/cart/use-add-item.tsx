/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import { useCallback } from 'react'
import type { MutationHook } from '@plasmicpkgs/commerce';
import { CommerceError } from '@plasmicpkgs/commerce';
import { useAddItem, UseAddItem } from '@plasmicpkgs/commerce';
import type { AddItemHook } from '../types/cart'
import useCart from './use-cart'

import {
  checkoutLineItemAddMutation,
  getCheckoutId,
  checkoutToCart,
  checkoutCreate,
} from '../utils'
import { Mutation, MutationCheckoutLineItemsAddArgs } from '../schema'

export default useAddItem as UseAddItem<typeof handler>

export const handler: MutationHook<AddItemHook> = {
  fetchOptions: {
    query: checkoutLineItemAddMutation,
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

    const lineItems = [
      {
        variantId: item.variantId,
        quantity: item.quantity ?? 1,
      },
    ]

    let checkoutId = getCheckoutId()
    if (!checkoutId) {
      return checkoutToCart(await checkoutCreate(fetch, lineItems))
    } else {
      const { checkoutLineItemsAdd } = await fetch<
        Mutation,
        MutationCheckoutLineItemsAddArgs
      >({
        ...options,
        variables: {
          checkoutId,
          lineItems,
        },
      })
      return checkoutToCart(checkoutLineItemsAdd)
    }
  },
  useHook:
    ({ fetch }) =>
    () => {
      const { mutate } = useCart()
      return useCallback(
        async function addItem(input) {
          const data = await fetch({ input })
          await mutate(data, false)
          return data
        },
        [fetch, mutate]
      )
    },
}
