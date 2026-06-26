import {
  GetProductHook,
  SWRHook,
  UseProduct,
  useProduct,
} from "@plasmicpkgs/commerce";
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
    query: "products",
    method: "get",
  },
  async fetcher({ input, options, fetch }) {
    const { id } = input;
    const product = await fetch({
      query: options.query,
      method: options.method,
      variables: [id],
    });
    if (!product) {
      return null;
    }
    return normalizeProduct(product);
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
