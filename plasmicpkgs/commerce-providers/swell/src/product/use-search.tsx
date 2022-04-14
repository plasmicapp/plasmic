/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: Added count as a parameter to input
*/
import { HookFetchInput, HookSWRInput, SWRHook } from '@plasmicpkgs/commerce'
import { useSearch, UseSearch } from '@plasmicpkgs/commerce'
import type { SearchProductsHook } from '@plasmicpkgs/commerce'
import { normalizeProduct } from '../utils'
import { SwellProduct } from '../types'
import { Category } from '../types/site'
import { walkCategoryTree } from '../utils/category-tree'

export type SearchProductsInput = {
  search?: string
  categoryId?: string
  brandId?: string
  sort?: string
  count?: number
  includeSubCategories?: boolean
  categories?: Category[]
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
    const {
      categoryId,
      includeSubCategories,
      categories,
      brandId,
      search,
      sort = 'latest-desc',
      count
    } = input
    const mappedSort = sortMap.get(sort)

    let products: SwellProduct[] = [];

    const _fetch: (categoryId?: string | number) => Promise<SwellProduct[]> = 
      async (categoryId?: string | number) => {
        const { results } = await fetch({
          query: options.query,
          method: options.method,
          variables: {
            category: categoryId,
            brand: brandId,
            search,
            sort: mappedSort,
            expand: ["variants"],
            limit: count
          },
        });
        return results;
      }
    
    if (!includeSubCategories) {
      products = await _fetch(categoryId);
    } else {
      const includedCategories = 
        walkCategoryTree(
          categories?.find(category => category.id === categoryId), 
          categories
        );
      products = (await Promise.all(includedCategories.flatMap(async category => 
          _fetch(category.id)
        ))).flatMap(products => products).slice(0, count);
    }


    return {
      products: products.map((product) => normalizeProduct(product)),
      found: products.length > 0,
    }
  },
  useHook:
    ({ useData }) =>
    (input = {}) => {
      return useData({
        input: [
          ['search', input.search],
          ['categoryId', input.categoryId],
          ['includeSubCategories', input.includeSubCategories],
          ['categories', input.categories],
          ['brandId', input.brandId],
          ['sort', input.sort],
          ['count', input.count]
        ] as HookSWRInput,
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      })
    },
}
