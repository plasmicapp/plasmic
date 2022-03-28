/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes:
    - Before: just returned an empty cart.
    - Now: Read cart from local storage.
*/
import { SWRHook } from '@plasmicpkgs/commerce'
import { useCart, UseCart } from '@plasmicpkgs/commerce'
import { LOCAL_CART_URL } from '../const'

export default useCart as UseCart<typeof handler>

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: '',
  },
  async fetcher({ input: { cartId }, options, fetch }) {
    if (!cartId) {
      cartId = LOCAL_CART_URL;
    }
    return JSON.parse(localStorage.getItem(cartId) ?? "null")
  },
  useHook:
    ({ useData }) =>
    (input) => {
      return useData({
        swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
      })
    },
}
