/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: 
    - Added count as a parameter to input
*/
import { SWRHook } from '@plasmicpkgs/commerce'
import { useSearch, UseSearch } from '@plasmicpkgs/commerce'

import {
  CollectionEdge,
  GetAllProductsQuery,
  GetProductsFromCollectionQueryVariables,
  Product as ShopifyProduct,
  ProductEdge,
} from '../schema'

import {
  getAllProductsQuery,
  getCollectionProductsQuery,
  getSearchVariables,
  normalizeProduct,
} from '../utils'

import type { SearchProductsHook } from '@plasmicpkgs/commerce'

export type SearchProductsInput = {
  search?: string
  categoryId?: number
  brandId?: number
  sort?: string
  locale?: string
  count?: number
}

export default useSearch as UseSearch<typeof handler>

export const handler: SWRHook<SearchProductsHook> = {
  fetchOptions: {
    query: getAllProductsQuery,
  },
  async fetcher({ input, options, fetch }) {
    const { categoryId, brandId } = input
    const method = options?.method
    const variables = getSearchVariables(input)
    let products

    // change the query to getCollectionProductsQuery when categoryId is set
    if (categoryId) {
      const data = await fetch<
        CollectionEdge,
        GetProductsFromCollectionQueryVariables
      >({
        query: getCollectionProductsQuery,
        method,
        variables: {
          ...variables,
          first: undefined
        }
      })
      // filter on client when brandId & categoryId are set since is not available on collection product query
      products = brandId
        ? data.node?.products?.edges?.filter(
            ({ node: { vendor } }: ProductEdge) =>
              vendor.replace(/\s+/g, '-').toLowerCase() === `${brandId}`.toLowerCase()
          ).slice(0, input.count)
        : data.node?.products?.edges
    } else {
      const data = await fetch<GetAllProductsQuery>({
        query: options.query,
        method,
        variables,
      })
      products = data.products?.edges
    }

    return {
      products: products?.map(({ node }) =>
        normalizeProduct(node as ShopifyProduct)
      ),
      found: !!products?.length,
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
          ['locale', input.locale],
          ['count', input.count]
        ],
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      })
    },
}
