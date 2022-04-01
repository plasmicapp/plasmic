import { useHook, useSWRHook } from '../utils/use-hook'
import { SWRFetcher } from '../utils/default-fetcher'
import type { SWRHook, HookFetcherFn } from '../utils/types'
import { Provider } from '../commerce'
import { GetBrandsHook } from '../types/site'

export type UseBrands<
  H extends SWRHook<GetBrandsHook<any>> = SWRHook<GetBrandsHook>
> = ReturnType<H['useHook']>

const fetcher: HookFetcherFn<GetBrandsHook> = SWRFetcher

const fn = (provider: Provider) => provider.site?.useBrands!;

const useBrands: UseBrands = (input) => {
  const hook = useHook(fn)
  return useSWRHook({ fetcher, ...hook })(input)
}

export default useBrands
