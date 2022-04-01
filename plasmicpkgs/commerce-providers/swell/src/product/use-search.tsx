/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: Added count as a parameter to input
*/
import { SWRHook } from '@plasmicpkgs/commerce'
import { useSearch, UseSearch } from '@plasmicpkgs/commerce'
import { normalizeProduct } from '../utils'
import { SwellProduct } from '../types'
import type { SearchProductsHook } from '@plasmicpkgs/commerce'

export type SearchProductsInput = {
  search?: string
  categoryId?: string
  brandId?: string
  sort?: string
  count?: number
}

export default useSearch as UseSearch<typeof handler>

export const handler: SWRHook<SearchProductsHook> = {
  fetchOptions: {
    query: 'products',
    method: 'list',
  },
  async fetcher({ input, options, fetch }) {
    const sortMap = new Map([
      ['latest-desc', ''],
      ['price-asc', 'price_asc'],
      ['price-desc', 'price_desc'],
      ['trending-desc', 'popularity'],
    ])
    const { categoryId, brandId, search, sort = 'latest-desc', count } = input
    const mappedSort = sortMap.get(sort)
    const { results, count: found } = await fetch({
      query: 'products',
      method: 'list',
      variables: {
        category: categoryId,
        brand: brandId,
        search,
        sort: mappedSort,
        expand: ["variants"],
        limit: count
      },
    })

    const products = results.map((product: SwellProduct) =>
      normalizeProduct(product)
    )

    return {
      products,
      found,
    }
  },
  useHook:
    ({ useData }) =>
    (input = {}) => {
      return useData({
        input: [
          ['search', input.search],
          ['categoryId', input.categoryId],
          ['brandId', input.brandId],
          ['sort', input.sort],
          ['count', input.count]
        ],
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      })
    },
}
