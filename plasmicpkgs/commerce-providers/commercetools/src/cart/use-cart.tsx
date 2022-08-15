import { useMemo } from 'react'
import { useCart as useCommerceCart, UseCart } from '@plasmicpkgs/commerce'
import { SWRHook } from '@plasmicpkgs/commerce'
import { getActiveCart, normalizeCart } from '../utils'
import { GetCartHook } from '../types/cart'

export default useCommerceCart as UseCart<typeof handler>

export const handler: SWRHook<GetCartHook> = {
  fetchOptions: {
    query: "cart",
    method: "get",
  },
  async fetcher({ input, options, fetch, provider }) {
    const activeCart = await getActiveCart(fetch);
    return activeCart ? normalizeCart(activeCart, provider!.locale) : null;
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
