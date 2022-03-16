/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
const getSiteInfoQuery = /* GraphQL */ `
  query getSiteInfo {
    shop {
      name
    }
  }
`
export default getSiteInfoQuery
