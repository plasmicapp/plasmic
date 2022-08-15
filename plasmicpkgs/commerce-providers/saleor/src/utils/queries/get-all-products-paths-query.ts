/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const getAllProductsPathsQuery = /* GraphQL */ `
  query getAllProductPaths($cursor: String, $channel: String = "default-channel") {
    products(first: 100, after: $cursor, channel: $channel) {
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
