import { SWRHook } from '@plasmicpkgs/commerce';
import { useCategories, UseCategories } from '@plasmicpkgs/commerce';
export default useCategories as UseCategories<typeof handler>
import data from "../data.json";

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: '',
  },
  async fetcher({ input, options, fetch }) {
    return [];
  },
  useHook: () => () => {
    return []
  },
}
