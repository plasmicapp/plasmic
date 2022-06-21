import { SWRHook, useCategories, UseCategories } from "@plasmicpkgs/commerce";
import React from "react";
import data from "../data.json";
export default useCategories as UseCategories<typeof handler>;

export const handler: SWRHook<any> = {
  fetchOptions: {
    query: "use-categories",
  },
  async fetcher({ input, options, fetch }) {
    const { categoryId } = input;
    if (!categoryId) {
      return data.categories;
    }
    const category = data.categories.find(
      (category) => category.id === categoryId
    );
    return category ? [category] : [];
  },
  useHook: ({ useData }) => (input) => {
    const response = useData({
      input: [["categoryId", input?.categoryId]],
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
