import { SiteTypes, useCategories, UseCategories } from '@plasmicpkgs/commerce'
import { SWRHook } from '@plasmicpkgs/commerce'
import { useMemo } from 'react'
import { SwellCategory } from '../types/site';
import { normalizeCategory } from '../utils';
import { topologicalSortForCategoryTree } from '../utils/category-tree';

export default useCategories as UseCategories<typeof handler>

type GetCategoriesHook = SiteTypes.GetCategoriesHook;

export const handler: SWRHook<GetCategoriesHook> = {
  fetchOptions: {
    query: 'categories',
    method: 'get',
  },
  async fetcher({ input, options, fetch }) {
    const { topologicalSort, addIsEmptyField, categoryId } = input;

    const data = await fetch({
      query: options.query,
      method: options.method,
      variables: {
        expand: [
          ...(topologicalSort ? ["children", "parent_id"] : []),
        ],
        id: categoryId
      }
    });
    
    let categories: SwellCategory[] = data?.results ?? [];
    if (addIsEmptyField) {
      categories = await Promise.all(categories.map(async category => ({
        ...category,
        products: (await fetch({
          query: 'products',
          method: 'list',
          variables: {
            limit: 1,
            category: category.id
          }
        })).results
      })));
    }

    return (
      topologicalSort 
        ? topologicalSortForCategoryTree(categories)
        : categories
      ).map((category) => normalizeCategory(category));
  },
  useHook:
    ({ useData }) =>
    (input) => {
      const response = useData({
        input: [
          ["topologicalSort", input?.topologicalSort],
          ["addIsEmptyField", input?.addIsEmptyField],
          ["categoryId", input?.categoryId]
        ],
        swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
      })
      return useMemo(
        () =>
          Object.create(response, {
            isEmpty: {
              get() {
                return (response.data?.length ?? 0) <= 0
              },
              enumerable: true,
            },
          }),
        [response]
      )
    },
  }
