/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: None
*/
import { SWRHook } from '@plasmicpkgs/commerce';
import { useSearch, UseSearch } from '@plasmicpkgs/commerce';
export default useSearch as UseSearch<typeof handler>
import data from "../data.json";

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: '',
  },
  async fetcher({ input, options, fetch }) {
    return {
      data: {
        products: data.products,
      }
    }
  },
  useHook: () => () => {
    return {
      data: {
        products: data.products,
      },
    }
  },
}
