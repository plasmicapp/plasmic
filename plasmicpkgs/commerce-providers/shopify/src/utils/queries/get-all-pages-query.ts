/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
export const getAllPagesQuery = /* GraphQL */ `
  query getAllPages($first: Int = 250) {
    pages(first: $first) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`
export default getAllPagesQuery
