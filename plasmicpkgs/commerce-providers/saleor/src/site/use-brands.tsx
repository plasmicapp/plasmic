import { SWRHook } from "@plasmicpkgs/commerce";
import { UseBrands, useBrands } from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import {
  GetAllProductPathsQuery,
  GetAllProductPathsQueryVariables,
} from "../schema";
import { GetBrandsHook } from "../types/site";
import { getAllProductVendors } from "../utils";

export default useBrands as UseBrands<typeof handler>;

export const handler: SWRHook<GetBrandsHook> = {
  fetchOptions: {
    query: getAllProductVendors,
  },
  async fetcher({ input, options, fetch }) {
    return []; // brands it's not available on saleor
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
                return (response.data?.length ?? 0) <= 0;
              },
              enumerable: true,
            },
          }),
        [response]
      );
    },
};
