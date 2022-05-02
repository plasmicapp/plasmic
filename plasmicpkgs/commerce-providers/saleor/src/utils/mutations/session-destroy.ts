/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const SessionDestroy = /* GraphQL */ `
  mutation SessionDestroy {
    tokensDeactivateAll {
      errors {
        field
        message
      }
    }
  }
`
