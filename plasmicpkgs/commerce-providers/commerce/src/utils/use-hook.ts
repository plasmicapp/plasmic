/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/commerce/src
  Changes: Add provider to useSWRHook and useMutationHook
*/
import { useCallback } from 'react'
import { Provider, useCommerce } from '../commerce'
import type { MutationHook, PickRequired, SWRHook } from './types'
import useData from './use-data'

export function useFetcher() {
  const { providerRef, fetcherRef } = useCommerce()
  return providerRef.current.fetcher ?? fetcherRef.current
}

export function useProvider() {
  const { providerRef } = useCommerce()
  return providerRef.current;
}

export function useHook<
  P extends Provider,
  H extends MutationHook<any> | SWRHook<any>
>(fn: (provider: P) => H) {
  const { providerRef } = useCommerce<P>();
  const provider = providerRef.current
  return fn(provider)
}

export function useSWRHook<H extends SWRHook<any>>(
  hook: PickRequired<H, 'fetcher'>
) {
  const fetcher = useFetcher()
  const provider = useProvider()

  return hook.useHook({
    useData(ctx) {
      const response = useData(hook, ctx?.input ?? [], fetcher, ctx?.swrOptions, provider)
      return response
    },
  })
}

export function useMutationHook<H extends MutationHook<any>>(
  hook: PickRequired<H, 'fetcher'>
) {
  const fetcher = useFetcher()
  const provider = useProvider()

  return hook.useHook({
    fetch: useCallback(
      ({ input } = {}) => {
        return hook.fetcher({
          input,
          options: hook.fetchOptions,
          fetch: fetcher,
          provider
        })
      },
      [fetcher, hook.fetchOptions]
    ),
  })
}
