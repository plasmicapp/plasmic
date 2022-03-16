/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
const getAllProductVendors = /* GraphQL */ `
  query getAllProductVendors($first: Int = 250, $cursor: String) {
    products(first: $first, after: $cursor) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          vendor
        }
        cursor
      }
    }
  }
`
export default getAllProductVendors
