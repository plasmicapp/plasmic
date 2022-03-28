/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: None
*/
import { MutationHook } from '@plasmicpkgs/commerce'
import {useRemoveItem,
  UseRemoveItem,
} from '@plasmicpkgs/commerce'

export default useRemoveItem as UseRemoveItem<typeof handler>

export const handler: MutationHook<any> = {
  fetchOptions: {
    query: '',
  },
  async fetcher({ input, options, fetch }) {},
  useHook:
    ({ fetch }) =>
    () => {
      return async function removeItem(input) {
        return {}
      }
    },
}
