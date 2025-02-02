import {
  SiteTypes,
  SWRHook,
  UseBrands,
  useBrands,
} from "@plasmicpkgs/commerce";
import { useMemo } from "react";
import {
  GetAllProductVendorsQuery,
  GetAllProductVendorsQueryVariables,
} from "../utils/graphql/gen/graphql";
import { getAllProductVendors } from "../utils/queries/get-all-product-vendors-query";

export default useBrands as UseBrands<typeof handler>;

export const handler: SWRHook<SiteTypes.GetBrandsHook> = {
  fetchOptions: {
    query: getAllProductVendors.toString(),
  },
  async fetcher({ input, options, fetch }) {
    const data = await fetch<
      GetAllProductVendorsQuery,
      GetAllProductVendorsQueryVariables
    >({
      query: getAllProductVendors.toString(),
      variables: {
        first: 250,
      },
    });

    let vendorsStrings = data.products.edges.map(
      ({ node: { vendor } }) => vendor
    );
    return Array.from(new Set(vendorsStrings).values()).map((v) => {
      const id = v.replace(/\s+/g, "-").toLowerCase();
      return {
        entityId: id,
        name: v,
        path: `brands/${id}`,
      };
    });
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
