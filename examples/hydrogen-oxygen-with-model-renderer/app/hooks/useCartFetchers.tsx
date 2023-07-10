import {useFetchers} from '@remix-run/react';

export function useCartFetchers(actionName: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('cartAction') === actionName) {
      cartFetchers.push(fetcher);
    }
  }
  return cartFetchers;
}
