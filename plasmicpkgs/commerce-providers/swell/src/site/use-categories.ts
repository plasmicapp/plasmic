import {
  SiteTypes,
  SWRHook,
  useCategories,
  UseCategories,
} from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { Category } from "../types/site";
import { normalizeCategory } from "../utils";
import { topologicalSortForCategoryTree } from "../utils/category-tree";
import { ensureNoNilFields } from "../utils/common";

export default useCategories as UseCategories<typeof handler>;

type GetCategoriesHook = SiteTypes.GetCategoriesHook;

export const handler: SWRHook<GetCategoriesHook> = {
  fetchOptions: {
    query: "categories",
    method: "get",
  },
  async fetcher({ input, options, fetch }) {
    const { addIsEmptyField, categoryId } = input;

    const data = await fetch({
      query: options.query,
      method: options.method,
      variables: ensureNoNilFields({
        expand: ["children", "parent_id"],
        id: categoryId,
      }),
    });

    let categories = data?.results ?? [];
    if (addIsEmptyField) {
      categories = await Promise.all(
        categories.map(async (category: any) => ({
          ...category,
          products: (
            await fetch({
              query: "products",
              method: "list",
              variables: ensureNoNilFields({
                limit: 1,
                category: category.id,
              }),
            })
          ).results,
        }))
      );
    }

    const normalizedCategories: Category[] = !categoryId
      ? topologicalSortForCategoryTree(categories.map(normalizeCategory))
      : categories.map(normalizeCategory);

    for (const category of normalizedCategories) {
      category.depth =
        (normalizedCategories.find((c) => c.id === category.parentId)?.depth ??
          -1) + 1;
    }
    return normalizedCategories;
  },
  useHook: ({ useData }) => (input) => {
    const response = useData({
      input: [
        ["addIsEmptyField", input?.addIsEmptyField],
        ["categoryId", input?.categoryId],
      ],
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
