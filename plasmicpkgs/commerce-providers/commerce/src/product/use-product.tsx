import { useHook, useSWRHook } from '../utils/use-hook'
import { SWRFetcher } from '../utils/default-fetcher'
import type { HookFetcherFn, SWRHook } from '../utils/types'
import type { GetProductHook, } from '../types/product'
import type { Provider } from '../commerce'

export type UseProduct<
  H extends SWRHook<GetProductHook<any>> = SWRHook<GetProductHook>
> = ReturnType<H['useHook']>

const fetcher: HookFetcherFn<GetProductHook> = SWRFetcher

const fn = (provider: Provider) => provider.products?.useProduct!

const useProduct: UseProduct = (input) => {
  const hook = useHook(fn)
  return useSWRHook({ fetcher, ...hook })(input)
}

export default useProduct
