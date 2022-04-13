/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: 
    - Before: The storeDomain and accessToken were defined at build time. 
      So this file just implemented a fetcher with these parameters defined.
    - Now: The storeDomain and accessToken are defined at runtime. 
      So we have to get the fetcher using these parameters.
*/
import { Fetcher } from '@plasmicpkgs/commerce'
import { handleFetchResponse } from './utils'

export const getFetcher: 
  (storeDomain: string, accessToken: string) => Fetcher =
  (storeDomain, accessToken) => {
    return async ({
      url = `https://${storeDomain}/api/2022-04/graphql.json`,
      method = 'POST',
      variables,
      query,
    }) => {
      const { locale, ...vars } = variables ?? {}
      return handleFetchResponse(
        await fetch(url, {
          method,
          body: JSON.stringify({ query, variables: vars }),
          headers: {
            'X-Shopify-Storefront-Access-Token': accessToken,
            'Content-Type': 'application/json',
            ...(locale && {
              'Accept-Language': locale,
            }),
          },
        })
      )
    }
}
