/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import { useCart, UseCart } from '@plasmicpkgs/commerce'
import { SWRHook } from '@plasmicpkgs/commerce'
import { useMemo } from 'react'
import { normalizeCart } from '../utils/normalize'
import { checkoutCreate, checkoutToCart } from './utils'
import type { CartType } from '@plasmicpkgs/commerce'

export default useCart as UseCart<typeof handler>

type GetCartHook = CartType.GetCartHook;

export const handler: SWRHook<GetCartHook> = {
  fetchOptions: {
    query: 'cart',
    method: 'get',
  },
  async fetcher({ fetch }) {
    const cart = await checkoutCreate(fetch)

    return cart ? normalizeCart(cart) : null
  },
  useHook:
    ({ useData }) =>
    (input) => {
      const response = useData({
        swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
      })
      return useMemo(
        () =>
          Object.create(response, {
            isEmpty: {
              get() {
                return (response.data?.lineItems.length ?? 0) <= 0
              },
              enumerable: true,
            },
          }),
        [response]
      )
    },
}
