/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: 
    - Added count as a parameter
*/
import getSortVariables from './get-sort-variables'
import { SearchProductsBody } from '@plasmicpkgs/commerce'

export const getSearchVariables = ({
  brandId,
  search,
  categoryId,
  sort,
  locale,
  count,
}: SearchProductsBody) => {
  let query = ''

  if (search) {
    query += `product_type:${search} OR title:${search} OR tag:${search} `
  }

  if (brandId) {
    query += `${search ? 'AND ' : ''}vendor:${brandId}`
  }

  return {
    categoryId,
    query,
    ...getSortVariables(sort, !!categoryId),
    ...(locale && {
      locale,
    }),
    first: count,
  }
}

export default getSearchVariables
