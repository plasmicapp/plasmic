/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: Added count as a parameter to input
*/
import type { SearchProductsHook } from "@plasmicpkgs/commerce";
import {
  HookSWRInput,
  SWRHook,
  useSearch,
  UseSearch,
} from "@plasmicpkgs/commerce";
import { SwellProduct } from "../types";
import { Category } from "../types/site";
import { normalizeProduct } from "../utils";
import { walkCategoryTree } from "../utils/category-tree";
import { ensureNoNilFields } from "../utils/common";

export type SearchProductsInput = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  sort?: string;
  count?: number;
  includeSubCategories?: boolean;
  categories?: Category[];
};

export default useSearch as UseSearch<typeof handler>;

export const handler: SWRHook<SearchProductsHook> = {
  fetchOptions: {
    query: "products",
    method: "list",
  },
  async fetcher({ input, options, fetch }) {
    const sortMap = new Map([
      ["latest-desc", ""],
      ["price-asc", "price asc"],
      ["price-desc", "price desc"],
      ["trending-desc", "popularity"],
    ]);
    const {
      categoryId,
      includeSubCategories,
      categories,
      brandId,
      search,
      sort = "latest-desc",
      count,
    } = input;
    const mappedSort = sortMap.get(sort);

    const includedCategories = includeSubCategories
      ? walkCategoryTree(
          categories?.find((category) => category.id === categoryId),
          categories
        )
      : undefined;

    const { results: products } = await fetch({
      query: options.query,
      method: options.method,
      variables: ensureNoNilFields({
        category: !includeSubCategories ? categoryId : undefined,
        brand: brandId,
        search,
        sort: mappedSort,
        expand: ["variants"],
        limit: count,
        $filters: {
          ...(includeSubCategories
            ? { category: includedCategories?.map((c) => c.id) }
            : {}),
        },
      }),
    });

    return {
      products: products.map((product: SwellProduct) =>
        normalizeProduct(product)
      ),
      found: products.length > 0,
    };
  },
  useHook: ({ useData }) => (input = {}) => {
    return useData({
      input: [
        ["search", input.search],
        ["categoryId", input.categoryId],
        ["includeSubCategories", input.includeSubCategories],
        ["categories", input.categories],
        ["brandId", input.brandId],
        ["sort", input.sort],
        ["count", input.count],
      ] as HookSWRInput,
      swrOptions: {
        revalidateOnFocus: false,
        ...input.swrOptions,
      },
    });
  },
};
