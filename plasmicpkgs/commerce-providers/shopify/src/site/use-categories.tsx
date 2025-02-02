import {
  SiteTypes,
  SWRHook,
  UseCategories,
  useCategories,
} from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { CollectionEdge } from "../utils/graphql/gen/graphql";
import { normalizeCategory } from "../utils/normalize";
import { getSiteCollectionsQuery } from "../utils/queries/get-all-collections-query";
import { getCollectionQueryById } from "../utils/queries/get-collection-query";

export default useCategories as UseCategories<typeof handler>;

export const handler: SWRHook<SiteTypes.GetCategoriesHook> = {
  fetchOptions: {
    query: getSiteCollectionsQuery.toString(),
  },
  async fetcher({ input, options, fetch }) {
    const { categoryId } = input;

    if (!categoryId) {
      const data = await fetch({
        query: options.query,
        variables: {
          first: 250,
        },
      });
      return (
        data?.collections?.edges?.map(({ node }: CollectionEdge) =>
          normalizeCategory(node)
        ) ?? []
      );
    } else {
      const data = await fetch({
        query: getCollectionQueryById.toString(),
        variables: {
          ...(categoryId.startsWith("gid://")
            ? { id: categoryId }
            : { handle: categoryId }),
        },
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
