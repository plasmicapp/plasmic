/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import type { SearchProductsInput } from "../product/use-search";
import getSortVariables from "./get-sort-variables";

export const getSearchVariables = ({
  brandId,
  search,
  categoryId,
  sort,
}: SearchProductsInput) => {
  let query = "";

  if (search) {
    query += `product_type:${search} OR title:${search} OR tag:${search}`;
  }

  if (brandId) {
    query += `${search ? " AND " : ""}vendor:${brandId}`;
  }

  return {
    categoryId,
    query,
    ...getSortVariables(sort, !!categoryId),
  };
};

export default getSearchVariables;
