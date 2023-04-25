/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: None
*/
import { SWRHook, useSearch, UseSearch } from "@plasmicpkgs/commerce";
import data from "../data.json";
import { sortProduct } from "../utils/sort-product";
const useSearchTyped: UseSearch<typeof handler> = useSearch;
export default useSearchTyped;

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: "use-search",
  },
  async fetcher({ input, options, fetch }) {
    const { search, categoryId, brandId, sort, count } = input;

    let products = data.products;

    if (categoryId) {
      const category = data.categories.find(
        (category) => category.id === categoryId
      );
      products = data.products.filter((product) =>
        category?.products?.includes(product.id)
      );
    }

    if (brandId) {
      products = products.filter(
        (product) =>
          product.vendor.replace(/\s+/g, "-").toLowerCase() ===
          `${brandId}`.toLowerCase()
      );
    }

    if (search) {
      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(`${search}`.toLowerCase()) ||
          product.slug.toLowerCase().includes(`${search}`.toLowerCase())
      );
    }

    if (sort) {
      products = products.sort((a, b) => sortProduct(a, b, sort));
    }

    return {
      products: products.slice(0, count),
      found: products.length > 0,
    };
  },
  useHook:
    ({ useData }) =>
    (input = {}) => {
      return useData({
        input: [
          ["search", input.search],
          ["prefixSearch", input.prefixSearch],
          ["categoryId", input.categoryId],
          ["brandId", input.brandId],
          ["sort", input.sort],
          ["locale", input.locale],
          ["count", input.count],
        ],
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      });
    },
};
