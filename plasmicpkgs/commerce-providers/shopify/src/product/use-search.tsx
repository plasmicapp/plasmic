/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes:
    - Added count as a parameter to input
*/
import type { SearchProductsHook } from "@plasmicpkgs/commerce";
import { SWRHook, useSearch, UseSearch } from "@plasmicpkgs/commerce";
import { getSearchVariables } from "../utils/get-search-variables";
import {
  CollectionEdge,
  GetAllProductsQuery,
  GetProductsFromCollectionQueryVariables,
  ProductEdge,
  Product as ShopifyProduct,
} from "../utils/graphql/gen/graphql";
import { normalizeProduct } from "../utils/normalize";
import { getAllProductsQuery } from "../utils/queries/get-all-products-query";
import { getCollectionProductsQuery } from "../utils/queries/get-collection-products-query";

const useSearchTyped: UseSearch<typeof handler> = useSearch;
export default useSearchTyped;

export const handler: SWRHook<SearchProductsHook> = {
  fetchOptions: {
    query: getAllProductsQuery.toString(),
  },
  async fetcher({ input, options, fetch }) {
    const { categoryId, brandId } = input;
    const method = options?.method;
    const variables = getSearchVariables(input);
    let products;

    // change the query to getCollectionProductsQuery when categoryId is set
    if (categoryId) {
      const data = await fetch<
        CollectionEdge,
        GetProductsFromCollectionQueryVariables
      >({
        query: getCollectionProductsQuery.toString(),
        method,
        variables: {
          ...variables,
          first: undefined,
        },
      });
      // filter on client when brandId & categoryId are set since is not available on collection product query
      products = brandId
        ? data.node?.products?.edges
            ?.filter(
              ({ node: { vendor } }: ProductEdge) =>
                vendor.replace(/\s+/g, "-").toLowerCase() ===
                `${brandId}`.toLowerCase()
            )
            .slice(0, input.count)
        : data.node?.products?.edges.slice(0, input.count);
    } else {
      const data = await fetch<GetAllProductsQuery>({
        query: options.query,
        method,
        variables,
      });
      products = data.products?.edges;
    }

    return {
      products: products?.map(({ node }) =>
        normalizeProduct(node as ShopifyProduct)
      ),
      found: !!products?.length,
    };
  },
  useHook:
    ({ useData }) =>
    (input = {}) => {
      return useData({
        input: [
          ["search", input.search],
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
