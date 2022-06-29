/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const CustomerCurrent = /* GraphQL */ `
  query CustomerCurrent {
    me {
      id
      email
      firstName
      lastName
      dateJoined
    }
  }
`
