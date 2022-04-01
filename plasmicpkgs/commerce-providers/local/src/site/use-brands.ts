import { SWRHook } from '@plasmicpkgs/commerce';
import { useBrands, UseBrands } from '@plasmicpkgs/commerce';
export default useBrands as UseBrands<typeof handler>
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
