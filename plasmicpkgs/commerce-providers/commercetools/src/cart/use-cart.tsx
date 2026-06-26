import {
  SWRHook,
  UseCart,
  useCart as useCommerceCart,
} from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { GetCartHook } from "../types/cart";
import { getActiveCart, normalizeCart } from "../utils";

const _default: UseCart<typeof handler> = useCommerceCart as UseCart<
  typeof handler
>;
export default _default;

export const handler: SWRHook<GetCartHook> = {
  fetchOptions: {
    query: "cart",
    method: "get",
  },
  async fetcher({ fetch, provider }) {
    const activeCart = await getActiveCart(fetch);
    return activeCart ? normalizeCart(activeCart, provider!.locale) : null;
  },
  useHook:
    ({ useData }) =>
    (input) => {
      const response = useData({
        swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
      });
      return useMemo(
        () =>
          Object.create(response, {
            isEmpty: {
              get() {
                return (response.data?.lineItems.length ?? 0) <= 0;
              },
              enumerable: true,
            },
          }),
        [response]
      );
    },
};
