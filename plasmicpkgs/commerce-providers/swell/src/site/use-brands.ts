import {
  SiteTypes,
  SWRHook,
  useBrands,
  UseBrands,
} from "@plasmicpkgs/commerce";
import { useMemo } from "react";

export default useBrands as UseBrands<typeof handler>;

type GetBrandsHook = SiteTypes.GetBrandsHook;

export const handler: SWRHook<GetBrandsHook> = {
  fetchOptions: {
    query: "attributes",
    method: "get",
  },
  async fetcher({ fetch }) {
    const vendors: [string] =
      (
        await fetch({
          query: "attributes",
          method: "get",
          variables: "brand",
        })
      )?.values ?? [];
    return Array.from(new Set(vendors).values()).map((v) => ({
      entityId: v,
      name: v,
      path: `brands/${v}`,
    }));
  },
  useHook: ({ useData }) => (input) => {
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
