import { SWRHook } from "@plasmicpkgs/commerce";
import { UseCategories, useCategories } from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { CollectionCountableEdge } from "../schema";
import { GetCategoriesHook } from "../types/site";
import { CollectionMany, CollectionOne, normalizeCategory } from "../utils";

export default useCategories as UseCategories<typeof handler>;

export const handler: SWRHook<GetCategoriesHook> = {
  fetchOptions: {
    query: CollectionMany,
  },
  async fetcher({ input, options, fetch }) {
    const { categoryId } = input;
    if (!categoryId) {
      const data = await fetch({
        query: CollectionMany,
        variables: {
          first: 250,
        },
      })

      return (
        data.collections?.edges?.map(({ node }: CollectionCountableEdge) =>
          normalizeCategory(node)
        ) ?? []
      );
    } else {
      const data = await fetch({
        query: CollectionOne,
        variables: { categoryId },
      });
      return !!data?.collection ? [normalizeCategory(data?.collection)] : [];
    }
  },
  useHook:
    ({ useData }) =>
      (input) => {
        const response = useData({
          input: [["categoryId", input?.categoryId]],
          swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
        });
        return useMemo(
          () =>
            Object.create(response, {
              isEmpty: {
                get() {
                  return (response.data?.length ?? 0) <= 0;
                },
                enumerable: true,
              },
            }),
          [response]
        );
      },
};