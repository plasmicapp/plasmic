/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import { getSortVariables } from './get-sort-variables'
import type { SearchProductsInput } from '../product/use-search'

export const getSearchVariables = ({ brandId, search, categoryId, sort, count }: SearchProductsInput) => {
  const sortBy = {
    field: 'NAME',
    direction: 'ASC',
    ...getSortVariables(sort, !!categoryId),
    channel: 'default-channel',
  }
  return {
    categoryId,
    filter: { search },
    sortBy,
    first: count
  }
}

export default getSearchVariables
