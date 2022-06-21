import { SWRHook, useProduct, UseProduct } from "@plasmicpkgs/commerce";
import data from "../data.json";
export default useProduct as UseProduct<typeof handler>;

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: "use-product",
  },
  async fetcher({ input, options, fetch }) {
    const { id } = input;

    return (
      data.products.find((product) =>
        [product.id, product.slug].includes(id)
      ) ?? null
    );
  },
  useHook: ({ useData }) => (input = {}) => {
    return useData({
      input: [["id", input.id]],
      swrOptions: {
        revalidateOnFocus: false,
        ...input.swrOptions,
      },
    });
  },
};
