import { SWRHook, UseBrands, useBrands } from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import { GetBrandsHook } from "../types/site";

const _default: UseBrands<typeof handler> = useBrands as UseBrands<
  typeof handler
>;
export default _default;

export const handler: SWRHook<GetBrandsHook> = {
  fetchOptions: {
    query: "",
  },
  async fetcher() {
    return null;
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
