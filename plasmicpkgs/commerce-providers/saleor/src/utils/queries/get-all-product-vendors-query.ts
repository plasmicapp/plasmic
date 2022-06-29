/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const getAllProductVendors = /* GraphQL */ `
  query getAllProductVendors($cursor: String, $channel: String = "default-channel") {
    products(first:100,channel: $channel, after: $cursor) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          slug
        }
        cursor
      }
    }
  }
`
