/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
export const getPageQuery = /* GraphQL */ `
  query getPage($id: ID!) {
    node(id: $id) {
      id
      ... on Page {
        title
        handle
        body
        bodySummary
      }
    }
  }
`
export default getPageQuery
