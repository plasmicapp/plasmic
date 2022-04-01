import { SWRHook } from '@plasmicpkgs/commerce'
import { UseCategories, useCategories } from '@plasmicpkgs/commerce'
import { useMemo } from "react";
import { CollectionEdge } from "../schema";
import { GetCategoriesHook } from "../types/site"
import { getSiteCollectionsQuery, normalizeCategory } from "../utils"

export default useCategories as UseCategories<typeof handler>

export const handler: SWRHook<GetCategoriesHook> = {
  fetchOptions: {
    query: getSiteCollectionsQuery,
  },
  async fetcher({ input, options, fetch }) {
    const data = await fetch({
      query: getSiteCollectionsQuery,
      variables: {
        first: 250,
      },
    });
    console.log("dale", "useCategories", data);
    return (
      data.collections?.edges?.map(({ node }: CollectionEdge) =>
        normalizeCategory(node)
      ) ?? []
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
