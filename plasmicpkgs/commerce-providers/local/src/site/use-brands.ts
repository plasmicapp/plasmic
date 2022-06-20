import { SWRHook, useBrands, UseBrands } from "@plasmicpkgs/commerce";
import React from "react";
import data from "../data.json";
export default useBrands as UseBrands<typeof handler>;

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: "use-brands",
  },
  async fetcher({ input, options, fetch }) {
    const vendorsStrings = data.products.map((product) => product.vendor);
    return Array.from(new Set(vendorsStrings).values()).map((v) => {
      const id = v.replace(/\s+/g, "-").toLowerCase();
      return {
        entityId: id,
        name: v,
        path: `brands/${id}`,
      };
    });
  },
  useHook: ({ useData }) => (input) => {
    const response = useData({
      swrOptions: { revalidateOnFocus: false, ...input?.swrOptions },
    });
    return React.useMemo(
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
