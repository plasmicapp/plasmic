/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: None
*/
import { useHook, useMutationHook } from '../utils/use-hook'
import { mutationFetcher } from '../utils/default-fetcher'
import type { HookFetcherFn, MutationHook } from '../utils/types'
import type { AddItemHook } from '../types/cart'
import type { Provider } from '../commerce'

export type UseAddItem<
  H extends MutationHook<AddItemHook<any>> = MutationHook<AddItemHook>
> = ReturnType<H['useHook']>

const fetcher: HookFetcherFn<AddItemHook> = mutationFetcher

const fn = (provider: Provider) => provider.cart?.useAddItem!

const useAddItem: UseAddItem = (...args) => {
  const hook = useHook(fn)
  return useMutationHook({ fetcher, ...hook })(...args)
}

export default useAddItem
