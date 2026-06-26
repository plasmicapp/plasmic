import { ClientResponse, ProductProjection } from "@commercetools/platform-sdk";
import type { GetProductHook } from "@plasmicpkgs/commerce";
import { SWRHook, useProduct, UseProduct } from "@plasmicpkgs/commerce";
import { normalizeProduct } from "../utils";

export type GetProductInput = {
  id?: string;
};

const _default: UseProduct<typeof handler> = useProduct as UseProduct<
  typeof handler
>;
export default _default;

export const handler: SWRHook<GetProductHook> = {
  fetchOptions: {
    query: "productProjections",
    method: "get",
  },
  async fetcher({ input, options, fetch, provider }) {
    const { id } = input;
    if (!id) {
      return null;
    }

    const product = await fetch<ClientResponse<ProductProjection>>({
      ...options,
      variables: {
        id,
      },
    });
    return product.body
      ? normalizeProduct(product.body, provider!.locale)
      : null;
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
