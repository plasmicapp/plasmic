/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import * as fragment from '../fragments'

export const CollectionOne = /* GraphQL */ `
  query getProductsFromCollection($categoryId: ID!, $first: Int = 100, $channel: String = "default-channel") {
    collection(id: $categoryId, channel: $channel) {
      id
      name
      slug
      products(first: $first) {
        ...ProductConnection
      }
    }
  }
  ${fragment.ProductConnection}
`
