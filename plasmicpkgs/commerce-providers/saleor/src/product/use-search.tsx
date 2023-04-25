/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes:None
*/

import { Product, SWRHook, useSearch, UseSearch } from "@plasmicpkgs/commerce";

import { ProductCountableEdge } from "../schema";
import { getSearchVariables, normalizeProduct } from "../utils";

import { SearchProductsHook } from "@plasmicpkgs/commerce";
import * as query from "../utils/queries";

const useSearchTyped: UseSearch<typeof handler> = useSearch;
export default useSearchTyped;

export type SearchProductsInput = {
  search?: string;
  categoryId?: string | number;
  brandId?: string | number;
  sort?: string;
  count?: number;
};

export type SearchProductsData = {
  products: Product[];
  found: boolean;
};

export const handler: SWRHook<SearchProductsHook> = {
  fetchOptions: {
    query: query.ProductMany,
  },
  async fetcher({ input, options, fetch }) {
    const { categoryId, brandId } = input;

    const data = await fetch({
      query: categoryId ? query.CollectionOne : options.query,
      method: options?.method,
      variables: getSearchVariables(input),
    });

    let edges;

    if (categoryId) {
      edges = data.collection?.products?.edges ?? [];
      // FIXME @zaiste, no `vendor` in Saleor
      // if (brandId) {
      //   edges = edges.filter(
      //     ({ node: { vendor } }: ProductCountableEdge) =>
      //       vendor.replace(/\s+/g, '-').toLowerCase() === brandId
      //   )
      // }
    } else {
      edges = data.products?.edges ?? [];
    }

    return {
      products: edges.map(({ node }: ProductCountableEdge) =>
        normalizeProduct(node)
      ),
      found: !!edges.length,
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
          ["count", input.count],
        ],
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      });
    },
};
