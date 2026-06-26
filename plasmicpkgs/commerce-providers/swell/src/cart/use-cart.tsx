/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import type { CartType } from "@plasmicpkgs/commerce";
import { SWRHook, useCart, UseCart } from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { normalizeCart } from "../utils/normalize";
import { checkoutCreate } from "./utils";

const _default: UseCart<typeof handler> = useCart as UseCart<typeof handler>;
export default _default;

type GetCartHook = CartType.GetCartHook;

export const handler: SWRHook<GetCartHook> = {
  fetchOptions: {
    query: "cart",
    method: "get",
  },
  async fetcher({ fetch }) {
    const cart = await checkoutCreate(fetch);

    return cart ? normalizeCart(cart) : null;
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
