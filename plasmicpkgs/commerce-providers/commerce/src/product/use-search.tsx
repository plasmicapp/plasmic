/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: None
*/
import { useHook, useSWRHook } from '../utils/use-hook'
import { SWRFetcher } from '../utils/default-fetcher'
import type { HookFetcherFn, SWRHook } from '../utils/types'
import type { SearchProductsHook } from '../types/product'
import type { Provider } from '../commerce'

export type UseSearch<
  H extends SWRHook<SearchProductsHook<any>> = SWRHook<SearchProductsHook>
> = ReturnType<H['useHook']>

export const fetcher: HookFetcherFn<SearchProductsHook> = SWRFetcher

const fn = (provider: Provider) => provider.products?.useSearch!

const useSearch: UseSearch = (input) => {
  const hook = useHook(fn)
  return useSWRHook({ fetcher, ...hook })(input)
}

export default useSearch
