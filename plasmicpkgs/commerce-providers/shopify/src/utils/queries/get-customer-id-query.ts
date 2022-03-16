/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
export const getCustomerQuery = /* GraphQL */ `
  query getCustomerId($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
    }
  }
`
export default getCustomerQuery
