/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes:
    - Added count as a parameter
*/
import { SearchProductsBody } from "@plasmicpkgs/commerce";
import getSortVariables from "./get-sort-variables";

export const getSearchVariables = ({
  brandId,
  search,
  categoryId,
  sort,
  locale,
  count,
}: SearchProductsBody) => {
  let query = "";

  const searchQuery = `${search}*`;
  if (search) {
    query += `product_type:${searchQuery} OR title:${searchQuery} OR tag:${searchQuery}`;
  }

  if (brandId) {
    query += `${search ? "AND " : ""}vendor:${brandId}`;
  }

  return {
    categoryId,
    query,
    ...getSortVariables(sort, !!categoryId),
    ...(locale && {
      locale,
    }),
    first: count,
  };
};

export default getSearchVariables;
