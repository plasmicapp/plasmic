/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: None
*/
import { useHook, useMutationHook } from '../utils/use-hook'
import { mutationFetcher } from '../utils/default-fetcher'
import type { HookFetcherFn, MutationHook } from '../utils/types'
import type { UpdateItemHook } from '../types/cart'
import type { Provider } from '../commerce'

export type UseUpdateItem<
  H extends MutationHook<UpdateItemHook<any>> = MutationHook<UpdateItemHook>
> = ReturnType<H['useHook']>

const fetcher: HookFetcherFn<UpdateItemHook> = mutationFetcher

const fn = (provider: Provider) => provider.cart?.useUpdateItem!

const useUpdateItem: UseUpdateItem = (input) => {
  const hook = useHook(fn)
  return useMutationHook({ fetcher, ...hook })(input)
}

export default useUpdateItem
