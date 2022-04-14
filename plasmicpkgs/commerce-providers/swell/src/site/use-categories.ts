import { SiteTypes, useCategories, UseCategories } from '@plasmicpkgs/commerce'
import { SWRHook } from '@plasmicpkgs/commerce'
import { useMemo } from 'react'

export default useCategories as UseCategories<typeof handler>

type GetCategoriesHook = SiteTypes.GetCategoriesHook;

export const handler: SWRHook<GetCategoriesHook> = {
  fetchOptions: {
    query: 'categories',
    method: 'get',
  },
  async fetcher({ fetch }) {
    const data = await fetch({
      query: 'categories',
      method: 'get',
      variables: {
        expand: ["children"]
      }
    });
    return (
      data.results.map(({ id, name, slug, children }: any) => ({
        id,
        name,
        slug,
        path: `/${slug}`,
        children: children.results,
      })) ?? []
    )
  },
  useHook:
    ({ useData }) =>
    (input) => {
      const response = useData({
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
