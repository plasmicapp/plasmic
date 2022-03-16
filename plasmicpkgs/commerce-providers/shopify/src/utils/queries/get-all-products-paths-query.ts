/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
const getAllProductsPathsQuery = /* GraphQL */ `
  query getAllProductPaths($first: Int = 250, $cursor: String) {
    products(first: $first, after: $cursor) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          handle
        }
        cursor
      }
    }
  }
`
export default getAllProductsPathsQuery
