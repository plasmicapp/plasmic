import { SWRHook, useProduct, UseProduct } from "@plasmicpkgs/commerce";

import type { GetProductHook } from "@plasmicpkgs/commerce";
import { normalizeProduct } from "../utils";

import { ProductOneById } from "../utils/queries/product-one-by-id";
import { ProductOneBySlug } from "../utils/queries/product-one-by-slug";

export type GetProductInput = {
  id?: string;
  slug?: string;
};

const _default: UseProduct<typeof handler> = useProduct as UseProduct<
  typeof handler
>;
export default _default;

export const handler: SWRHook<GetProductHook> = {
  fetchOptions: {
    query: ProductOneById,
  },
  async fetcher({ input, fetch }) {
    const { id } = input;
    if (!id) {
      return null;
    }
    const data = await fetch({
      query: ProductOneById,
      variables: { id },
    });
    if (!data.product) {
      const response = await fetch({
        query: ProductOneBySlug,
        variables: { slug: id },
      });
      return response.product ? normalizeProduct(response.product) : null;
    }
    return data.product ? normalizeProduct(data.product) : null;
  },
  useHook:
    ({ useData }) =>
    (input = {}) => {
      return useData({
        input: [["id", input.id]],
        swrOptions: {
          revalidateOnFocus: false,
          ...input.swrOptions,
        },
      });
    },
};
