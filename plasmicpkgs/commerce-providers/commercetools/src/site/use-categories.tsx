import {
  Category,
  CategoryPagedQueryResponse,
  ClientResponse,
} from "@commercetools/platform-sdk";
import { SWRHook, UseCategories, useCategories } from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { GetCategoriesHook } from "../types/site";
import { normalizeCategory } from "../utils";

const _default: UseCategories<typeof handler> = useCategories as UseCategories<
  typeof handler
>;
export default _default;

export const handler: SWRHook<GetCategoriesHook> = {
  fetchOptions: {
    query: "categories",
    method: "get",
  },
  async fetcher({ input, options, fetch, provider }) {
    const { categoryId } = input;
    if (!categoryId) {
      const categories = await fetch<
        ClientResponse<CategoryPagedQueryResponse>
      >({
        ...options,
      });
      return categories.body
        ? categories.body.results.map((category) =>
            normalizeCategory(category, provider!.locale)
          )
        : [];
    } else {
      const category = await fetch<ClientResponse<Category>>({
        ...options,
        variables: {
          ...(categoryId ? { id: categoryId } : {}),
        },
      });
      return category.body
        ? [normalizeCategory(category.body, provider!.locale)]
        : [];
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
