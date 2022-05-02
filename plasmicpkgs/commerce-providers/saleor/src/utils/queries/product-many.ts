/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import * as fragment from '../fragments'

export const ProductMany = /* GraphQL */ `
  query ProductMany(
    $first: Int = 100
    $filter: ProductFilterInput
    $sortBy: ProductOrder
    $channel: String = "default-channel"
  ) {
    products(first: $first, channel: $channel, filter: $filter, sortBy: $sortBy) {
      ...ProductConnection
    }
  }
  ${fragment.ProductConnection}
`
