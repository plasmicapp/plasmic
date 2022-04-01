import { useHook, useSWRHook } from '../utils/use-hook'
import { SWRFetcher } from '../utils/default-fetcher'
import type { SWRHook, HookFetcherFn } from '../utils/types'
import { Provider } from '../commerce'
import { GetCategoriesHook } from '../types/site'

export type UseCategories<
  H extends SWRHook<GetCategoriesHook<any>> = SWRHook<GetCategoriesHook>
> = ReturnType<H['useHook']>

const fetcher: HookFetcherFn<GetCategoriesHook> = SWRFetcher

const fn = (provider: Provider) => provider.site?.useCategories!;

const useCategories: UseCategories = (input) => {
  const hook = useHook(fn)
  return useSWRHook({ fetcher, ...hook })(input)
}

export default useCategories
