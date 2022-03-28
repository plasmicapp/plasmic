/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: None
*/
import { MutationHook } from '@plasmicpkgs/commerce'
import { useUpdateItem,
  UseUpdateItem,
} from '@plasmicpkgs/commerce'

export default useUpdateItem as UseUpdateItem<any>

export const handler: MutationHook<any> = {
  fetchOptions: {
    query: '',
  },
  async fetcher({ input, options, fetch }) {},
  useHook:
    ({ fetch }) =>
    () => {
      return async function addItem() {
        return {}
      }
    },
}
